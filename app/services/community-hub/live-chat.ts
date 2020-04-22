import Vue from 'vue';
import { Subscription } from 'rxjs';
import { StatefulService, mutation, ViewHandler } from 'services/core/stateful-service';
import { Inject } from 'services/core/injector';
import { InitAfter } from 'services/core';
import { ChatWebsocketService, IInternalEvent } from './chat-websocket';
import { CommunityHubService, IFriend, IChatRoom } from '.';
import { UserService, LoginLifecycle } from 'services/user';

export interface IMessage {
  user_id: number;
  room: string;
  message: string;
  display_name: string;
  avatar: string;
  date_posted?: string;
}

interface ILiveChatState {
  messages: Dictionary<Array<IMessage>>;
  matchmakingInterval: number;
  matchFound: string;
}

class LiveChatViews extends ViewHandler<ILiveChatState> {
  messages(chatId: string) {
    if (!this.state.messages[chatId]) return [];
    return this.state.messages[chatId];
  }
}

@InitAfter('UserService')
export class LiveChatService extends StatefulService<ILiveChatState> {
  @Inject() private chatWebsocketService: ChatWebsocketService;
  @Inject() private communityHubService: CommunityHubService;
  @Inject() private userService: UserService;

  static initialState: ILiveChatState = {
    messages: {},
    matchmakingInterval: Infinity,
    matchFound: null,
  };

  @mutation()
  ADD_MESSAGE(chatId: string, message: IMessage) {
    if (!this.state.messages[chatId]) Vue.set(this.state.messages, chatId, []);
    this.state.messages[chatId].push(message);
  }

  @mutation()
  DESTROY_CHAT(chatId: string) {
    Vue.delete(this.state.messages, chatId);
  }

  @mutation()
  LOAD_MESSAGES(messages: Dictionary<Array<IMessage>>) {
    this.state.messages = messages;
  }

  @mutation()
  SET_POLLING_INTERVAL(interval: number) {
    this.state.matchmakingInterval = interval;
  }

  @mutation()
  SET_MATCH_FOUND(timestamp: string) {
    this.state.matchFound = timestamp;
  }

  async init() {
    this.lifecycle = await this.userService.withLifecycle({
      init: this.subscribeToSocketConnections,
      destroy: this.unsubscribeFromSocketConnections,
      context: this,
    });
  }

  get views() {
    return new LiveChatViews(this.state);
  }

  lifecycle: LoginLifecycle;
  messageSocketConnection: Subscription = null;
  internalEventSocketConnection: Subscription = null;
  roomUpdateSocketConnection: Subscription = null;

  async subscribeToSocketConnections() {
    // this.messageSocketConnection = this.chatWebsocketService.chatMessageEvent.subscribe(ev =>
    //   this.recieveMessage(ev.data, ev.user),
    // );
    // this.internalEventSocketConnection = this.chatWebsocketService.internalEvent.subscribe(ev => {
    //   this.handleInternalEvent(ev);
    // });
    // this.roomUpdateSocketConnection = this.chatWebsocketService.roomUpdateEvent.subscribe(ev => {
    //   if (ev.action === 'new_member') {
    //     this.chatWebsocketService.sendStatusUpdate('online', null, ev.room.name);
    //     this.communityHubService.getChatMembers(ev.room.name);
    //   }
    // });
  }

  async unsubscribeFromSocketConnections() {
    if (this.messageSocketConnection) this.messageSocketConnection.unsubscribe();
    if (this.internalEventSocketConnection) this.internalEventSocketConnection.unsubscribe();
    if (this.roomUpdateSocketConnection) this.roomUpdateSocketConnection.unsubscribe();
  }

  async handleInternalEvent(ev: IInternalEvent) {
    if (ev.action === 'status_update') {
      this.updateStatus(ev.data.user, ev.data.status);
    }
    if (ev.action === 'new_friend_request') {
      this.communityHubService.addFriendRequest(ev.data.request);
    }
    if (ev.action === 'friend_request_accepted') {
      this.communityHubService.updateUsers([
        { is_friend: true, status: 'online', chat_names: [], ...ev.data.user },
      ]);
    }
    if (ev.action === 'added_to_dm') {
      this.addRoomToState(ev.data as IChatRoom);
    }
  }

  async matchmake(game: string, tags: Array<string>, size: number) {
    const resp = await this.communityHubService.postResponse('lfg', { game, size, tags });
    this.SET_POLLING_INTERVAL(resp.interval);
    if (resp.success && resp.room) {
      this.chatWebsocketService.joinRoom(resp.room);
      this.addRoomToState(resp.room);
      this.SET_MATCH_FOUND(resp.group.created_at);
    }
    if (resp.success && this.state.matchmakingInterval) {
      window.setTimeout(() => this.matchmake(game, tags, size), this.state.matchmakingInterval);
    }
  }

  async addRoomToState(roomData: IChatRoom, lfg = false) {
    await this.communityHubService.getChatMembers(roomData.name);
    if (roomData.type === 'dm') {
      const members = this.communityHubService.views.usersInRoom(roomData.name);
      const title = roomData.title || members[0]?.name;
      const existingChat = this.communityHubService.state.chatrooms.find(
        chat => chat.name === roomData.name,
      );
      if (!existingChat) {
        this.communityHubService.addChat({ ...(roomData as IChatRoom), title }, false);
      }
    } else {
      this.communityHubService.setLfgChat(roomData);
    }
  }

  updateStatus(user: IFriend, status: string) {
    this.communityHubService.updateUsers([{ ...user, status }]);
  }

  sendStatusUpdate(status: string, game?: string) {
    this.chatWebsocketService.sendStatusUpdate(status, game);
  }

  recieveMessage(messageObj: Partial<IMessage>, user: IFriend) {
    const message = {
      user_id: user.id,
      display_name: user.name,
      room: messageObj.room,
      message: messageObj.message,
      avatar: user.avatar,
      date_posted: Date.now().toLocaleString(),
    };

    this.ADD_MESSAGE(messageObj.room, message);
  }

  sendMessage(chatId: string, message: string) {
    this.chatWebsocketService.sendMessage({ room: chatId, message });
  }
}

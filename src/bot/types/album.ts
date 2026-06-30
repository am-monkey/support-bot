import type { Api } from "grammy";
import type {
  InputMediaAudio,
  InputMediaDocument,
  InputMediaPhoto,
  InputMediaVideo,
} from "grammy/types";

export type MediaType = "photo" | "video" | "audio" | "document";

type GroupMedia =
  | InputMediaPhoto
  | InputMediaVideo
  | InputMediaAudio
  | InputMediaDocument;

const MEDIA_ORDER: MediaType[] = ["photo", "video", "audio", "document"];

/**
 * An album of media files grouped by Telegram's media_group_id.
 * Equivalent to the Python Album model.
 */
export class Album {
  readonly photo: string[] = [];
  readonly video: string[] = [];
  readonly audio: string[] = [];
  readonly document: string[] = [];
  caption?: string;

  add(type: MediaType, fileId: string): void {
    this[type].push(fileId);
  }

  get isEmpty(): boolean {
    return MEDIA_ORDER.every((type) => this[type].length === 0);
  }

  private buildMediaGroup(): GroupMedia[] {
    const group: GroupMedia[] = [];
    for (const type of MEDIA_ORDER) {
      for (const media of this[type]) {
        group.push({ type, media } as GroupMedia);
      }
    }
    if (group.length > 0 && this.caption !== undefined) {
      group[0].caption = this.caption;
    }
    return group;
  }

  /** Sends the album as a media group. */
  async copyTo(
    api: Api,
    chatId: number,
    options: { message_thread_id?: number } = {},
  ): Promise<unknown> {
    return api.sendMediaGroup(chatId, this.buildMediaGroup(), options);
  }
}

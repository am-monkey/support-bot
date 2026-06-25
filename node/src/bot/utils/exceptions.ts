export class CreateForumTopicException extends Error {
  static readonly message =
    "Unable to create a topic on the forum. The chat was not found, " +
    "or forum topics are not activated.";

  constructor() {
    super(CreateForumTopicException.message);
    this.name = "CreateForumTopicException";
  }
}

export class NotEnoughRightsException extends Error {
  static readonly message =
    "The bot doesn't have sufficient rights to create a forum topic.";

  constructor() {
    super(NotEnoughRightsException.message);
    this.name = "NotEnoughRightsException";
  }
}

export class NotAForumException extends Error {
  static readonly message =
    "The chat is not configured as a forum, or you lack the necessary permissions to manage topics. " +
    "Please activate topics first or request administrator privileges.";

  constructor() {
    super(NotAForumException.message);
    this.name = "NotAForumException";
  }
}

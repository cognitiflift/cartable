// Erreur renvoyée telle quelle au client, avec son statut HTTP.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export class apiResponse {
  private status: number | null;
  private message: string | null;
  private data: any | null;
  private error: any | null;

  constructor(status: number, message: string, data: any, error: any) {
    this.status = status;
    this.message = message;
    this.error = error;
    this.data = data;
  }
}

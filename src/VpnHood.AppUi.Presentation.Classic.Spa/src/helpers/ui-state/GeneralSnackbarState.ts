export class GeneralSnackbarState {
  public message: string = "";
  public bgColor: string = "highlight";
  public textColor: string | null = null;
  public hasTimer: boolean | null = null;
  public timeOut: number | null = null;
  public hasCloseBtn: boolean | null = null;
  public isShow: boolean = false;
}

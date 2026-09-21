// noinspection SpellCheckingInspection
import {initializeApp} from 'firebase/app'
import type {FirebaseApp,FirebaseOptions} from 'firebase/app'
import { getAnalytics, logEvent, setAnalyticsCollectionEnabled, setUserId } from 'firebase/analytics';
import type {Analytics} from 'firebase/analytics'
import { getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';

export class VhFirebaseApp {

  private static _firebaseApp: FirebaseApp | null = null;
  private readonly _analytics: Analytics;
  // noinspection JSUnusedGlobalSymbols
  public get firebaseApp(): FirebaseApp{
    if (VhFirebaseApp._firebaseApp === null)
      throw new Error('Firebase app is not initialized');

    return VhFirebaseApp._firebaseApp;
  }
  // noinspection JSUnusedGlobalSymbols
  public get analytics(): Analytics {
    return this._analytics;
  }

  public constructor(firebaseOptions: FirebaseOptions, clientId:string){
    // initializeApp throws on a second call with different options; reuse the one we already made so
    // re-enabling analytics mid-session (see VpnHoodApp.syncAnalyticsConsent) cannot fail the launch.
    const firebaseApp = VhFirebaseApp._firebaseApp ?? initializeApp(firebaseOptions);
    VhFirebaseApp._firebaseApp = firebaseApp;
    this._analytics = getAnalytics(firebaseApp);
    setUserId(this._analytics, clientId );
  }

  public static tryCreate(firebaseOptions?: FirebaseOptions, clientId?:string): VhFirebaseApp | null{
    try{
      // Init firebase and analytics
      // Note: if you want to prevent your testing and development from affecting your measurements, you must use the
      // below Chrome extension.
      // https://chromewebstore.google.com/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna?pli=1
      // More info: https://firebase.google.com/docs/analytics/debugview#web
      if (!firebaseOptions){
        console.log('the firebaseOptions is not set in the app features -> customData -> firebaseOptions.');
        return null;
      }
      if (!clientId){
        console.log("the clientId is not set in the app features -> customData -> clientId.");
        return null;
      }

      return  new VhFirebaseApp(firebaseOptions, clientId);
    }
    catch(err){
      console.error('Firebase: Failed to initialize Firebase app:', err);
      return null;
    }
  }

  // Stops/resumes GA4 collection on an instance that already exists. Withdrawing consent mid-session
  // has to silence the SDK itself, not just our call sites: Firebase also gathers page_view and
  // session events on its own, which no amount of not-calling-logEvent would suppress.
  public setCollectionEnabled(enabled: boolean): void {
    try {
      setAnalyticsCollectionEnabled(this._analytics, enabled);
    } catch (err: unknown) {
      console.error(`An error occurred while changing the Analytics collection state. Error: ${err}`);
    }
  }

  public analyticsLogEvent(eventName: string, eventParams: object) {
    try {
      logEvent(this._analytics, eventName, eventParams);
    } catch (err: unknown) {
      console.error(`An error occurred while logging event to Analytics. Error: ${err}`);
    }
  }

  public async sendRate(reviewText: string|null, clientId: string, directory: string, rate: number){

    // File name suffixes
    const rateSuffix: string = `rate-${rate}`;
    const noContentSuffix = reviewText?.trim() ? '' : '_no-content';

    // Add review text to the file if it is null or empty
    const fileContent = reviewText?.trim() || '**No review text provided**';

    const fileName: string = this.generateNameForStorage(clientId) + `_${rateSuffix}${noContentSuffix}`;
    await this.sendFileToStorage(fileContent, fileName, directory);
  }

  public async sendReport(fileContent: string, clientId: string, directory: string, isTv: boolean){
    const fileName: string =  this.generateNameForStorage(clientId);

    if (!isTv)
      this.openGoogleDoc(fileName);

    else
      await this.sendFileToStorage(fileContent, fileName, directory);
  }

  private async sendFileToStorage(fileContent: string, fileName: string, directory: string): Promise<void> {
    try {
      const blob = new Blob([fileContent], { type: "text/plain" });
      const file = new File([blob], `${fileName}.txt`, { type: "text/plain" });
      const storage = getStorage();
      const fileRef = storageRef(storage, `${directory}/${file.name}`);

      // Send the rate
      await uploadBytes(fileRef, file);
      console.log('Firebase: File has been sent!');
    } catch (ex) {
      console.error(`Firebase: Failed to upload file:`, ex);
    }
  }

  private generateNameForStorage(clientId: string): string {
    const timestamp = new Date().toISOString().substring(0, 19).replace(/[:\-T]/g, '');
    const random = Math.random().toString().substring(2, 10);
    return `${timestamp}-${clientId}@${random}`;
  }

  private openGoogleDoc(reportId: string): void {
    const link: string = `https://docs.google.com/forms/d/e/1FAIpQLSeOT6vs9yTqhAONM2rJg8Acae-oPZTecoVrdPrzJ-3VsgJk0A/viewform?usp=sf_link&entry.450665336=${reportId}`;
    window.open(link, 'VpnHood-BugReport');
  }
}

import router from "@/services/router";
import AsyncLock from 'async-lock';

export class ComponentRouteController {

    public componentName: string;
    public constructor(componentName: string) {
        this.componentName = componentName;
    }

    public get isVisible(): boolean {
        return ComponentRouteController.isShowComponent(this.componentName);
    }

    // noinspection JSUnusedGlobalSymbols
    public set isVisible(value: boolean) {
        ComponentRouteController.showComponent(this.componentName, value).then();
    }

    public async show( value: boolean = true ): Promise<void> {
        if (ComponentRouteController.isShowComponent(this.componentName) !== value)
            return ComponentRouteController.showComponent(this.componentName, value);
    }

    private static isShowComponent(componentName: string): boolean {
        return router.currentRoute.value.query[componentName] === "true";
    }

    private static delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private static async showComponent(componentName: string, value: boolean = true): Promise<void> {
        const showLock: AsyncLock = new AsyncLock();
        await showLock.acquire("showLock", async () => {
            // wait to make sure we are not in the middle of navigation
            // v-model may call showComponentin middle of navigation
            await this.delay(100);
            await this.showComponentInternal(componentName, value);

            // let next process done after router navigation completed
            // because the next step may involve changing another route
            await this.delay(100);
        });
    }

    private static async showComponentInternal(componentName: string, value: boolean): Promise<void> {
        if (value === this.isShowComponent(componentName))
            return;

        const route = router.currentRoute.value;
        if (value) {
            await router.push({ path: route.path, query: { ...route.query, [componentName]: "true" } });
            window.document.title = componentName;
        } else {
            // make sure remove the component query param before call router.back()
            // because router.back() is not async, and this method will return without removing the query param
            // so loop may occur
            const query = { ...route.query };
            delete query[componentName];
            const pageLocation = router.resolve({ path: route.path, query: query }).fullPath;
            await router.replace(pageLocation);

            // Remove the entry the dialog pushed from the browser history (router.replace cannot) -
            // but only when the entry below it is this page, which is what the push put it on top of.
            // It is not when the dialog was raised while a navigation away was being cancelled: a
            // leave guard that shows a message runs after the browser has already moved to the
            // previous page, so the dialog's entry sits on top of THAT, and going back would leave
            // the page, run the guard, and show the dialog again, for ever (the countries page's
            // "enable at least one country", 2026-09-13). The router records where each entry
            // came from in history.state.back.
            if (window.history.state?.back === pageLocation)
                router.back();
        }
    }
}

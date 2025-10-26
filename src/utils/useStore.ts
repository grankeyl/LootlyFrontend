let __getStore: any = null;

const GetStore = (store: any, callback: (store: any) => void) => {
    __getStore = setInterval(() => {
        if (store !== null) {
            clearInterval(__getStore);
            __getStore = null;
            callback(store);
        }
    }, 100);
};

export { GetStore };
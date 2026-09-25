// Fix for "global is not defined" error in libraries like sockjs-client
(window as any).global = window;

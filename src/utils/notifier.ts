const notifier = require("node-notifier");

export function notifyError(title: string, message: string) {
  notifier.notify(
    {
      title,
      message,
      sound: true,
      wait: true,
    },
    function (err: any, response: any, metadata: any) {
      if (err) console.error(err);
      console.log("Notification sound played.");
    }
  );
}

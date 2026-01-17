export class Logger {
  static info(message: string) {
    console.log(message);
  }

  static error(message: string, error?: any) {
    console.error(message);
    if (error) {
      console.error(error);
    }
  }

  static warn(message: string) {
    console.warn(message);
  }

  static success(message: string) {
    console.log(`✅ ${message}`);
  }

  static separator(char: string = "=", length: number = 80) {
    console.log(char.repeat(length));
  }
}

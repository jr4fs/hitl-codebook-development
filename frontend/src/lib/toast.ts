import { notifications } from "@mantine/notifications";

export const toast = {
  success: (message: string) => {
    notifications.show({
      title: "Success",
      message,
      color: "green",
      autoClose: 9000,
    });
  },

  error: (message: string) => {
    notifications.show({
      title: "Error",
      message,
      color: "red",
      autoClose: 7000,
    });
  },

  info: (message: string) => {
    notifications.show({
      title: "Info",
      message,
      color: "blue",
      autoClose: 3000,
    });
  },
};

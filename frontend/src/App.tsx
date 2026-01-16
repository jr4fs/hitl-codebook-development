import "@mantine/core/styles.css";
import "@mantine/dropzone/styles.css";
import { MantineProvider } from "@mantine/core";
import { RouterProvider } from "react-router";
import { router } from "./router";
import { Provider } from "react-redux";
import { store } from "./store/store";

export default function App() {
  return (
    <Provider store={store}>
      <MantineProvider>
        <RouterProvider router={router} />
      </MantineProvider>
    </Provider>
  );
}

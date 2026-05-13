import type { Meta, StoryObj } from "@storybook/react-vite";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import DemoApp from "../demo/DemoApp";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import CodebookLandingPage from "../pages/CodebookLandingPage";
import LoginPage from "../pages/LoginPage";
import userReducer from "../store/userSlice";
import {
  handlersReady,
  handlersSamplingError,
  handlersSamplingPending,
  handlersSamplingTransition,
} from "./mswHandlers";

const meta: Meta<typeof DemoApp> = {
  title: "Demo/App Flows",
  component: DemoApp,
  parameters: {
    layout: "fullscreen",
    docs: {
      canvas: {
        layout: "fullscreen",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const HappyPath_MainJourney: Story = {
  render: () => <DemoApp createRouter route="/home" />,
  parameters: { msw: { handlers: handlersReady } },
};

HappyPath_MainJourney.parameters = {
  ...HappyPath_MainJourney.parameters,
  docs: {
    description: {
      story:
        "Start at home page and use in-app navigation to explore the happy path: codebook flow, upload page, and review workflow.",
    },
  },
};

export const State_Pending_Sampling: Story = {
  render: () => <DemoApp createRouter route="/codebook-creation/demo-task-1" />,
  parameters: { msw: { handlers: handlersSamplingPending } },
};

export const State_Pending_ToReadyTransition: Story = {
  render: () => <DemoApp createRouter route="/codebook-creation/demo-task-1" />,
  parameters: { msw: { handlers: handlersSamplingTransition() } },
};

export const State_Error_SamplingFailed: Story = {
  render: () => <DemoApp createRouter route="/codebook-creation/demo-task-1" />,
  parameters: { msw: { handlers: handlersSamplingError } },
};

function SessionExpiredApp() {
  const expiredJwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1IiwiZXhwIjoxMDAwLCJ1c2VybmFtZSI6ImRlbW8iLCJlbWFpbCI6ImRlbW9AZXhhbXBsZS5jb20ifQ.sig";
  const store = configureStore({
    reducer: { user: userReducer },
    preloadedState: {
      user: {
        user: { id: "demo-user", name: "Demo User", username: "demo", email: "demo@example.com" },
        accessToken: expiredJwt,
        refreshToken: "demo-refresh",
      },
    },
  });

  const router = createMemoryRouter(
    [
      {
        element: <ProtectedRoute />,
        children: [{ path: "/", element: <CodebookLandingPage /> }],
      },
      { path: "/login", element: <LoginPage /> },
    ],
    { initialEntries: ["/"] },
  );

  return (
    <Provider store={store}>
      <MantineProvider defaultColorScheme="dark">
        <Notifications position="top-right" />
        <RouterProvider router={router} />
      </MantineProvider>
    </Provider>
  );
}

export const SessionExpiredRedirect: Story = {
  render: () => <SessionExpiredApp />,
  parameters: { msw: { handlers: handlersReady } },
};

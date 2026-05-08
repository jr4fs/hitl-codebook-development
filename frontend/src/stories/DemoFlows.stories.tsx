import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import userReducer from "../store/userSlice";
import { AppLayout } from "../components/layout/AppLayout";
import AnnotationPage from "../pages/AIAnnotationPage";
import NewAnnotationTaskPage from "../pages/NewAnnotationTaskPage";
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import CodebookLandingPage from "../pages/CodebookLandingPage";
import DatasetUploadPage from "../pages/DatasetUploadPage";
import AnnotateDatasetLandingPage from "../pages/AnnotateDatasetLandingPage";
import AnnotateDatasetPage from "../pages/AnnotateDatasetPage";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import {
  handlersEmpty,
  handlersPermissionDenied,
  handlersReady,
  handlersSamplingError,
  handlersSamplingPending,
  handlersSamplingTransition,
  handlersServerError,
} from "./mswHandlers";

const makeStore = () =>
  configureStore({
    reducer: { user: userReducer },
    preloadedState: {
      user: {
        user: { id: "demo-user", username: "demo", email: "demo@example.com" },
        accessToken: "demo-token",
        refreshToken: "demo-refresh",
      },
    },
  });

function DemoApp({ route = "/", element }: { route?: string; element?: ReactNode }) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <AppLayout />,
        children: [
          { index: true, element: <LandingPage /> },
          { path: "codebook-landing", element: <CodebookLandingPage /> },
          { path: "new-codebook", element: <DatasetUploadPage /> },
          { path: "annotate-dataset-landing", element: <AnnotateDatasetLandingPage /> },
          { path: "new-annotation", element: <NewAnnotationTaskPage /> },
          { path: "annotate-dataset/:id", element: <AnnotateDatasetPage /> },
          { path: "codebook-creation/:taskId", element: <AnnotationPage /> },
        ],
      },
    ],
    { initialEntries: [route] },
  );

  return (
    <Provider store={makeStore()}>
      <MantineProvider defaultColorScheme="dark">
        <Notifications position="top-right" />
        {element ?? <RouterProvider router={router} />}
      </MantineProvider>
    </Provider>
  );
}

const meta: Meta<typeof DemoApp> = {
  title: "Demo/App Flows",
  component: DemoApp,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Landing: Story = {
  render: () => <DemoApp route="/" />,
  parameters: { msw: { handlers: handlersReady } },
};

export const TaskCreationPage: Story = {
  render: () => <DemoApp route="/new-annotation" />,
  parameters: { msw: { handlers: handlersReady } },
};

export const CodebookLanding: Story = {
  render: () => <DemoApp route="/codebook-landing" />,
  parameters: { msw: { handlers: handlersReady } },
};

export const CodebookTaskUploadPage: Story = {
  render: () => <DemoApp route="/new-codebook" />,
  parameters: { msw: { handlers: handlersReady } },
};

export const SamplingPending: Story = {
  render: () => <DemoApp route="/codebook-creation/demo-task-1" />,
  parameters: { msw: { handlers: handlersSamplingPending } },
};

export const AIReview_ReadyImmediate: Story = {
  render: () => <DemoApp route="/codebook-creation/demo-task-1" />,
  parameters: { msw: { handlers: handlersReady } },
};

export const AIReview_PendingThenReady: Story = {
  render: () => <DemoApp route="/codebook-creation/demo-task-1" />,
  parameters: { msw: { handlers: handlersSamplingTransition() } },
};

export const SamplingErrorState: Story = {
  render: () => <DemoApp route="/codebook-creation/demo-task-1" />,
  parameters: { msw: { handlers: handlersSamplingError } },
};

export const EmptyState: Story = {
  render: () => <DemoApp route="/codebook-creation/demo-task-1" />,
  parameters: { msw: { handlers: handlersEmpty } },
};

export const PermissionDeniedState: Story = {
  render: () => <DemoApp route="/codebook-creation/demo-task-1" />,
  parameters: { msw: { handlers: handlersPermissionDenied } },
};

export const ServerErrorState: Story = {
  render: () => <DemoApp route="/codebook-creation/demo-task-1" />,
  parameters: { msw: { handlers: handlersServerError } },
};

function SessionExpiredApp() {
  const expiredJwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1IiwiZXhwIjoxMDAwLCJ1c2VybmFtZSI6ImRlbW8iLCJlbWFpbCI6ImRlbW9AZXhhbXBsZS5jb20ifQ.sig";
  const store = configureStore({
    reducer: { user: userReducer },
    preloadedState: {
      user: {
        user: { id: "demo-user", username: "demo", email: "demo@example.com" },
        accessToken: expiredJwt,
        refreshToken: "demo-refresh",
      },
    },
  });

  const router = createMemoryRouter(
    [
      {
        element: <ProtectedRoute />,
        children: [{ path: "/", element: <LandingPage /> }],
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

import { createBrowserRouter } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import { AppLayout } from "./components/layout/AppLayout";
import LandingPage from "./pages/LandingPage";
import SubsamplingPage from "./pages/SubsamplingPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PublicRoute } from "./components/auth/PublicRoute";

export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      //redirect to landing page if user is logged in
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/signup",
        element: <SignUpPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      // Protected routes
      {
        path: "/",
        element: <AppLayout />,
        children: [
          {
            path: "",
            element: <LandingPage />,
          },
          {
            path: "/new-task/:taskId?",
            element: <SubsamplingPage />,
          },
        ],
      },
    ],
  },
]);

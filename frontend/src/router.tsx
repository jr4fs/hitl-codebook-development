import { createBrowserRouter } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import { AppLayout } from "./components/layout/AppLayout";
import DatasetUploadPage from "./pages/DatasetUploadPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PublicRoute } from "./components/auth/PublicRoute";
import AnnotationPage from "./pages/AIAnnotationPage";
import CodebookLandingPage from "./pages/CodebookLandingPage";

export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      // Redirect to landing page if user is logged in
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
            element: <CodebookLandingPage />,
          },
          {
            path: "/new-codebook",
            element: <DatasetUploadPage />,
          },
          {
            path: "/codebook-creation/:taskId?",
            element: <AnnotationPage />,
          },
        ],
      },
    ],
  },
]);

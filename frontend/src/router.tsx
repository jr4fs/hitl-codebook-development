import { createBrowserRouter } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import { AppLayout } from "./components/layout/AppLayout";
import LandingPage from "./pages/LandingPage";
import DatasetUploadPage from "./pages/DatasetUploadPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PublicRoute } from "./components/auth/PublicRoute";
import AnnotationPage from "./pages/AIAnnotationPage";
import NewAnnotationTaskPage from "./pages/NewAnnotationTaskPage";
import AnnotateDatasetPage from "./pages/AnnotateDatasetPage";
import CodebookLandingPage from "./pages/CodebookLandingPage";
import AnnotateDatasetLandingPage from "./pages/AnnotateDatasetLandingPage";
import DashboardPage from "./pages/DashboardPage";

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
            element: <LandingPage />,
          },
          {
            path: "/codebook-landing",
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
          {
            path: "/new-annotation",
            element: <NewAnnotationTaskPage />,
          },
          {
            path: "/new-annotation/:taskId",
            element: <NewAnnotationTaskPage />,
          },
          {
            path: "/annotate-dataset/:id",
            element: <AnnotateDatasetPage />,
          },
          {
            path: "/annotate-dataset-landing",
            element: <AnnotateDatasetLandingPage />,
          },
          {
            path: "/dashboard/:taskId",
            element: <DashboardPage />,
          },
        ],
      },
    ],
  },
]);

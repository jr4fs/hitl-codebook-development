import type { Preview } from "@storybook/react-vite";
import "@mantine/core/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/notifications/styles.css";
import "../src/index.css";
import { initialize, mswLoader } from "msw-storybook-addon";

// Storybook-only runtime override for AI annotation demo pacing.
(globalThis as { __ANNOTATION_BATCH_SIZE__?: number }).__ANNOTATION_BATCH_SIZE__ = 3;

initialize();

const preview: Preview = {
  loaders: [mswLoader],
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
};

export default preview;

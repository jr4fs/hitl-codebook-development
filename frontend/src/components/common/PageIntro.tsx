import {
  Button,
  Checkbox,
  Group,
  Modal,
  Stack,
  Text,
  type ModalProps,
  useMantineColorScheme,
} from "@mantine/core";
import { IconHelpCircle } from "@tabler/icons-react";
import { useState } from "react";
import styles from "./PageIntro.module.css";

interface PageIntroProps {
  mode?: "firstRun" | "help";
  opened: boolean;
  onClose: () => void;
  title: string;
  description: string;
  storageKey: string;
  skipLabel?: string;
  startLabel?: string;
  onSkip?: () => void;
  onStart?: () => void;
}

export default function PageIntro({
  mode = "firstRun",
  opened,
  onClose,
  title,
  description,
  storageKey,
  skipLabel = "Skip tour",
  startLabel = "Start tour",
  onSkip,
  onStart,
}: PageIntroProps) {
  const { colorScheme } = useMantineColorScheme();
  const isLight = colorScheme === "light";
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const modalStyles: ModalProps["styles"] = {
    content: {
      backgroundColor: isLight ? "#ffffff" : "rgba(20, 28, 34, 0.98)",
      border: isLight
        ? "1px solid rgba(15, 20, 24, 0.12)"
        : "1px solid rgba(124, 231, 225, 0.25)",
      boxShadow: isLight
        ? "0 24px 60px rgba(0, 0, 0, 0.15)"
        : "0 24px 60px rgba(0, 0, 0, 0.35)",
      color: isLight ? "#0f1418" : "#e8eef1",
    },
    header: { backgroundColor: "transparent" },
    title: { color: isLight ? "#0f1418" : "#e8eef1", fontWeight: 600 },
    close: { color: isLight ? "#0f1418" : "#e8eef1" },
  };
  const overlayColor = isLight ? "#f7fafb" : "#11171c";
  const showDontShowAgain = mode === "firstRun";

  const closeWithPersistence = () => {
    if (mode === "firstRun" && dontShowAgain) {
      localStorage.setItem(storageKey, "true");
    }
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={closeWithPersistence}
      centered
      title={title}
      overlayProps={{ blur: 2, opacity: 0.5, color: overlayColor }}
      styles={modalStyles}
    >
      <Stack gap="sm">
        <Text>{description}</Text>
        {showDontShowAgain && (
          <Checkbox
            className={styles.checkbox}
            label="Don't show again"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.currentTarget.checked)}
          />
        )}
        <Group justify="space-between" mt={10}>
          <Button
            variant="outline"
            onClick={() => {
              closeWithPersistence();
              onSkip?.();
            }}
          >
            {skipLabel}
          </Button>
          <Button
            variant="light"
            leftSection={<IconHelpCircle size={16} />}
            onClick={() => {
              closeWithPersistence();
              onStart?.();
            }}
          >
            {startLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

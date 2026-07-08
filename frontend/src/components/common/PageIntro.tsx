/* eslint-disable react-refresh/only-export-components */
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
import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { shouldShowPageIntro } from "./pageIntroStorage";
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
  showSecondaryAction?: boolean;
  primaryOnlyLabel?: string;
  showDontShowAgain?: boolean;
  dontShowAgainChecked?: boolean;
  onDontShowAgainChange?: Dispatch<SetStateAction<boolean>>;
}

export function usePageIntroTour(storageKey: string) {
  const [introOpen, setIntroOpen] = useState(() => shouldShowPageIntro(storageKey));
  const [introMode, setIntroMode] = useState<"firstRun" | "help">("firstRun");
  const [tourOpen, setTourOpen] = useState(false);

  const openHelpIntro = useCallback(() => {
    setIntroMode("help");
    setIntroOpen(true);
  }, []);

  return {
    introOpen,
    introMode,
    tourOpen,
    setIntroOpen,
    setTourOpen,
    openHelpIntro,
  };
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
  showSecondaryAction = true,
  primaryOnlyLabel = "Got it",
  showDontShowAgain,
  dontShowAgainChecked,
  onDontShowAgainChange,
}: PageIntroProps) {
  const { colorScheme } = useMantineColorScheme();
  const isLight = colorScheme === "light";
  const [internalDontShowAgain, setInternalDontShowAgain] = useState(false);
  const dontShowAgain = dontShowAgainChecked ?? internalDontShowAgain;

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
  const shouldShowDontShowAgain = showDontShowAgain ?? mode === "firstRun";

  const closeWithPersistence = () => {
    if (mode === "firstRun" && dontShowAgain && !onDontShowAgainChange) {
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
        {shouldShowDontShowAgain && (
          <Checkbox
            className={styles.checkbox}
            label="Don't show again"
            checked={dontShowAgain}
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              if (onDontShowAgainChange) {
                onDontShowAgainChange(checked);
              } else {
                setInternalDontShowAgain(checked);
              }
            }}
          />
        )}
        <Group justify="space-between" mt={10}>
          {showSecondaryAction ? (
            <Button
              variant="outline"
              onClick={() => {
                closeWithPersistence();
                onSkip?.();
              }}
            >
              {skipLabel}
            </Button>
          ) : (
            <span />
          )}
          <Button
            variant="light"
            leftSection={<IconHelpCircle size={16} />}
            onClick={() => {
              closeWithPersistence();
              onStart?.();
            }}
          >
            {showSecondaryAction ? startLabel : primaryOnlyLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

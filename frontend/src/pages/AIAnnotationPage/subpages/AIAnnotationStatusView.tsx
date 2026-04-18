import { Box, Button, Center, Loader, LoadingOverlay, Stack, Text } from "@mantine/core";

interface LoadingStatusProps {
  isLight: boolean;
  message: string;
}

export function LoadingStatus({ isLight, message }: LoadingStatusProps) {
  return (
    <Box
      mih="100dvh"
      bg={isLight ? "#f7fafb" : "var(--app-bg)"}
      style={{ position: "relative" }}
    >
      <LoadingOverlay
        visible
        zIndex={1}
        overlayProps={{
          blur: 2,
          color: isLight ? "#f7fafb" : "#0f1418",
          opacity: isLight ? 0.78 : 0.72,
        }}
        loaderProps={{
          children: (
            <Stack align="center" gap="xs">
              <Loader color={isLight ? "blue" : "cyan"} />
              <Text c={isLight ? "#0f1418" : "white"} fw={500} ta="center">
                {message}
              </Text>
            </Stack>
          ),
        }}
      />
    </Box>
  );
}

interface ErrorStatusProps {
  isLight: boolean;
  message: string;
  onGoHome: () => void;
}

export function ErrorStatus({ isLight, message, onGoHome }: ErrorStatusProps) {
  return (
    <Center h="100vh" bg="var(--app-bg)">
      <Stack align="center" gap="md">
        <Text c={isLight ? "#0f1418" : "white"}>{message}</Text>
        <Button onClick={onGoHome}>Go Home</Button>
      </Stack>
    </Center>
  );
}

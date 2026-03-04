import { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  Switch,
  Textarea,
  Button,
  Group,
  Text,
  Title,
  Divider,
  TextInput,
  ActionIcon,
  Paper,
  LoadingOverlay,
  Alert,
  FileButton,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconDownload,
  IconUpload,
  IconAlertCircle,
} from "@tabler/icons-react";
import { PhraseMapping } from "@common/types/anonymize";
import {
  getAnonymizeConfig,
  updateAnonymizeConfig,
  downloadNamesFile,
  uploadNamesFile,
} from "../../services/anonymize.service";
import { toast } from "../../lib/toast";

interface AnonymizeConfigModalProps {
  opened: boolean;
  onClose: () => void;
}

export default function AnonymizeConfigModal({
  opened,
  onClose,
}: AnonymizeConfigModalProps) {
  const { colorScheme } = useMantineColorScheme();
  const isLight = colorScheme === "light";
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Config state
  const [ageEnabled, setAgeEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [phoneEnabled, setPhoneEnabled] = useState(true);
  const [pronounEnabled, setPronounEnabled] = useState(false);
  const [phrases, setPhrases] = useState<PhraseMapping[]>([]);
  const [skipWords, setSkipWords] = useState("");

  // Load config on open
  useEffect(() => {
    if (opened) {
      loadConfig();
    }
  }, [opened]);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAnonymizeConfig();
      if (response.success && response.config) {
        const config = response.config;
        setAgeEnabled(config.ageEnabled);
        setEmailEnabled(config.emailEnabled);
        setPhoneEnabled(config.phoneEnabled);
        setPronounEnabled(config.pronounEnabled);
        setPhrases(config.phrases || []);
        setSkipWords((config.skipWords || []).join("\n"));
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const skipWordsArray = skipWords
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      await updateAnonymizeConfig({
        ageEnabled,
        emailEnabled,
        phoneEnabled,
        pronounEnabled,
        phrases,
        skipWords: skipWordsArray,
      });
      toast.success("Configuration saved successfully");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadNames = async () => {
    try {
      const { blob, filename } = await downloadNamesFile();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err?.message || "Failed to download names file");
    }
  };

  const handleUploadNames = async (file: File | null) => {
    if (!file) return;
    try {
      const response = await uploadNamesFile(file);
      if (response.success) {
        toast.success("Names file uploaded successfully");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to upload names file");
    }
  };

  const addPhrase = () => {
    setPhrases([...phrases, { text: "", replacement: "" }]);
  };

  const removePhrase = (index: number) => {
    setPhrases(phrases.filter((_, i) => i !== index));
  };

  const updatePhrase = (
    index: number,
    field: "text" | "replacement",
    value: string,
  ) => {
    const updated = [...phrases];
    updated[index] = { ...updated[index], [field]: value };
    setPhrases(updated);
  };

  const modalSurface = isLight ? "#ffffff" : "#1C1A1A";
  const panelSurface = isLight ? "#f4f7f9" : "#2C2C2C";
  const panelBorder = isLight ? "rgba(15, 20, 24, 0.12)" : "#444";
  const inputSurface = isLight ? "#ffffff" : "#1C1A1A";
  const inputText = isLight ? "#0f1418" : "#D8D8D8";

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Title order={3}>Configure Anonymization</Title>}
      size="lg"
      centered
      styles={{
        header: {
          backgroundColor: modalSurface,
          color: inputText,
        },
        body: {
          backgroundColor: modalSurface,
          color: inputText,
        },
        content: { backgroundColor: modalSurface },
      }}
    >
      <LoadingOverlay visible={loading} />

      <Stack gap="md">
        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            color="red"
            onClose={() => setError(null)}
            withCloseButton
          >
            {error}
          </Alert>
        )}

        {/* Names File Section */}
        <Paper p="md" bg={panelSurface} radius="sm">
          <Text fw={500} mb="sm">
            Names File
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            Upload a CSV with names to anonymize (columns: First Name, Middle
            Name, Last Name, Other Name)
          </Text>
          <Group>
            <Button
              variant="outline"
              color="gray"
              leftSection={<IconDownload size={16} />}
              onClick={handleDownloadNames}
            >
              Download Current
            </Button>
            <FileButton onChange={handleUploadNames} accept=".csv,text/csv">
              {(props) => (
                <Button
                  {...props}
                  variant="filled"
                  color="blue"
                  leftSection={<IconUpload size={16} />}
                >
                  Upload New
                </Button>
              )}
            </FileButton>
          </Group>
        </Paper>

        <Divider color={panelBorder} />

        {/* Toggle Rules */}
        <Paper p="md" bg={panelSurface} radius="sm">
          <Text fw={500} mb="md">
            Rule Toggles
          </Text>
          <Stack gap="sm">
            <Switch
              label="Anonymize Ages"
              description="Replace age values like 'age 61' with [AGE]"
              checked={ageEnabled}
              onChange={(e) => setAgeEnabled(e.currentTarget.checked)}
              color="blue"
              styles={{
                track: { cursor: "pointer" },
                label: { cursor: "pointer" },
              }}
            />
            <Switch
              label="Anonymize Emails"
              description="Replace email addresses with [EMAIL]"
              checked={emailEnabled}
              onChange={(e) => setEmailEnabled(e.currentTarget.checked)}
              color="blue"
              styles={{
                track: { cursor: "pointer" },
                label: { cursor: "pointer" },
              }}
            />
            <Switch
              label="Anonymize Phone Numbers"
              description="Replace phone numbers with [PHONE]"
              checked={phoneEnabled}
              onChange={(e) => setPhoneEnabled(e.currentTarget.checked)}
              color="blue"
              styles={{
                track: { cursor: "pointer" },
                label: { cursor: "pointer" },
              }}
            />
            <Switch
              label="Anonymize Pronouns"
              description="Replace pronouns (she, he, they, etc.) with [PRONOUN]"
              checked={pronounEnabled}
              onChange={(e) => setPronounEnabled(e.currentTarget.checked)}
              color="blue"
              styles={{
                track: { cursor: "pointer" },
                label: { cursor: "pointer" },
              }}
            />
          </Stack>
        </Paper>

        <Divider color={panelBorder} />

        {/* Phrase Mappings */}
        <Paper p="md" bg={panelSurface} radius="sm">
          <Text fw={500} mb="md">
            Phrase Replacements
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            Define phrases and their replacements (e.g., "Mercy Medical" →
            "ORG")
          </Text>
          <Stack gap="xs">
            {phrases.map((phrase, index) => (
              <Group key={index} gap="xs" align="flex-end">
                <TextInput
                  placeholder="Phrase to match"
                  value={phrase.text}
                  onChange={(e) => updatePhrase(index, "text", e.target.value)}
                  style={{ flex: 1 }}
                  styles={{
                    input: {
                      backgroundColor: inputSurface,
                      borderColor: panelBorder,
                      color: inputText,
                    },
                  }}
                />
                <TextInput
                  placeholder="Replacement"
                  value={phrase.replacement}
                  onChange={(e) =>
                    updatePhrase(index, "replacement", e.target.value)
                  }
                  style={{ flex: 1 }}
                  styles={{
                    input: {
                      backgroundColor: inputSurface,
                      borderColor: panelBorder,
                      color: inputText,
                    },
                  }}
                />
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => removePhrase(index)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            ))}
            {phrases.length === 0 && (
              <Text size="sm" c="dimmed" ta="center">
                No custom phrases defined
              </Text>
            )}
          </Stack>
          <Group justify="flex-end" mt="md">
            <Button
              variant="light"
              color="blue"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={addPhrase}
            >
              Add Phrase
            </Button>
          </Group>
        </Paper>

        <Divider color={panelBorder} />

        {/* Skip Words */}
        <Paper p="md" bg={panelSurface} radius="sm">
          <Text fw={500} mb="sm">
            Skip Words
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            Words to skip during anonymization (separate with new lines or
            commas)
          </Text>
          <Textarea
            placeholder="Enter words to skip, one per line or comma-separated..."
            value={skipWords}
            onChange={(e) => setSkipWords(e.target.value)}
            minRows={4}
            maxRows={8}
            autosize
            styles={{
              input: {
                backgroundColor: inputSurface,
                borderColor: panelBorder,
                color: inputText,
              },
            }}
          />
        </Paper>

        <Divider color={panelBorder} />

        {/* Actions */}
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button color="blue" onClick={handleSave} loading={saving}>
            Save Configuration
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

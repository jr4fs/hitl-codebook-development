import { Task } from "@common/types/tasks";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildCodebookExportContent, toSafeFilename } from "../utils";

interface UseCodebookManagerArgs {
  task: Task | null;
}

export function useCodebookManager({ task }: UseCodebookManagerArgs) {
  const [codebook, setCodebook] = useState<string[]>([]);
  const [lastPromptUsed, setLastPromptUsed] = useState("");
  const [newRule, setNewRule] = useState("");
  const [stagedRules, setStagedRules] = useState<string[]>([]);
  const [stagedRulesDeletion, setStagedRulesDeletion] = useState<string[]>([]);
  const prevTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    const nextTaskId = task?._id ?? null;
    if (!nextTaskId || prevTaskIdRef.current === nextTaskId) return;

    prevTaskIdRef.current = nextTaskId;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCodebook(Array.isArray(task?.codebook) ? task.codebook : []);
    setLastPromptUsed("");
    setNewRule("");
    setStagedRules([]);
    setStagedRulesDeletion([]);
  }, [task?._id, task?.codebook]);

  const addRule = () => {
    if (!newRule.trim()) return;
    setStagedRules((prev) => [...prev, newRule.trim()]);
    setNewRule("");
  };

  const toggleDeleteRule = (rule: string) => {
    setStagedRulesDeletion((prev) =>
      prev.includes(rule) ? prev.filter((r) => r !== rule) : [...prev, rule],
    );
  };

  const editRule = (rule: string) => {
    if (!stagedRulesDeletion.includes(rule)) {
      setStagedRulesDeletion((prev) => [...prev, rule]);
    }
    setNewRule(rule);
  };

  const removeStagedRule = (index: number) => {
    setStagedRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExportCodebook = () => {
    if (!task?.name) return;
    const name = toSafeFilename(task.name) || "task";
    const filename = `${name}_codebook_and_prompt.txt`;
    const content = buildCodebookExportContent(codebook, lastPromptUsed);

    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const getCodebookSnapshot = useCallback(
    () => [...codebook, ...stagedRules],
    [codebook, stagedRules],
  );

  return {
    codebook,
    setCodebook,
    lastPromptUsed,
    setLastPromptUsed,
    newRule,
    setNewRule,
    stagedRules,
    setStagedRules,
    stagedRulesDeletion,
    setStagedRulesDeletion,
    addRule,
    toggleDeleteRule,
    editRule,
    removeStagedRule,
    handleExportCodebook,
    getCodebookSnapshot,
  };
}

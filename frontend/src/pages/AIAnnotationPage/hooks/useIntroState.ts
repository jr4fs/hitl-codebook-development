import { useState } from "react";

interface UseIntroStateArgs {
  storageKey: string;
}

export function useIntroState({ storageKey }: UseIntroStateArgs) {
  const [introOpen, setIntroOpen] = useState(
    () => localStorage.getItem(storageKey) !== "true",
  );
  const [introDontShow, setIntroDontShow] = useState(false);
  const [introShowCheckbox, setIntroShowCheckbox] = useState(true);

  const handleCloseIntro = () => {
    if (introShowCheckbox && introDontShow) {
      localStorage.setItem(storageKey, "true");
    }
    setIntroOpen(false);
  };

  const handleHelp = () => {
    setIntroShowCheckbox(false);
    setIntroOpen(true);
  };

  return {
    introOpen,
    introDontShow,
    introShowCheckbox,
    setIntroDontShow,
    handleHelp,
    handleCloseIntro,
  };
}

import { Text, Center, Stack, Image, Box } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";
import { useRef } from "react";

export default function LandingPage() {
    const inputFileRef = useRef<HTMLInputElement>(null); 
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Selected file:", file);
      // Handle CSV file
    }
  };

  return (
    <Center bg="#000000" w="100vw" h="100vh">
      <Box
        pos="relative"
        w="210px"
        h="210px"
        onClick={() => inputFileRef.current?.click()}
        style={{ cursor: "pointer" }}
      >
        <Image
          src="/uploadBtn.svg"
          alt="Upload"
          w="100%"
          h="100%"
          fit="contain"
        />
        <Center pos="absolute" top={0} left={0} w="100%" h="100%">
          <Stack align="center" gap="sm">
            <IconUpload size={36} stroke={1.5} color="white" />
            <Text c="white">+ Upload CSV</Text>
          </Stack>
        </Center>
      </Box>
      <input
        ref={inputFileRef}
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />
    </Center>
  );
}

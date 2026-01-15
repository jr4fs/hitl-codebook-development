import {
  Text,
  Stack,
  Flex,
  Button,
  ActionIcon,
  ScrollArea,
} from "@mantine/core";
import {
  IconSquarePlus,
  IconLayoutSidebar,
  IconUserCircle,
  IconFile,
  IconHistory,
} from "@tabler/icons-react";
import { useHover } from "@mantine/hooks";
import "./styles/Sidebar.css";
import { useSelector } from 'react-redux';
import { IRootState } from "../../store/store";

//Props to handle navbar collapsed/expanded state
interface SideBarProps {
  collapsed: boolean;
  toggleCollapsed: () => void;
}


export const SideBar = ({ collapsed, toggleCollapsed }: SideBarProps) => {
  const { hovered, ref } = useHover();
  const userState = useSelector((state: IRootState) => state.user.user);
  if (collapsed) {
    //Collapsed sidebar
    return (
      <Stack h="100%" bg="#1E1E1E" w="70px">
        <Button
          ref={ref}
          fullWidth
          variant="transparent"
          size="xl"
          onClick={toggleCollapsed}
          c="white"
          h="auto"
          p="0"
          mt="10"
          bd="0px"
          classNames={{ root: "sidebar-button-collapsed" }}
        >
          {hovered ? (
            <IconLayoutSidebar size={36} stroke={1.5} />
          ) : (
            <Text fz="36px" lh="1">
              AT
            </Text>
          )}
        </Button>
        <ActionIcon
          w="100%"
          size="xl"
          radius="md"
          c="white"
          variant="subtle"
          classNames={{ root: "sidebar-button-collapsed" }}
        >
          <IconSquarePlus size={28} stroke={1.5} />
        </ActionIcon>

        <ActionIcon
          w="100%"
          size="xl"
          radius="md"
          c="white"
          variant="subtle"
          classNames={{ root: "sidebar-button-collapsed" }}
        >
          <IconHistory size={28} stroke={1.5} />
        </ActionIcon>

        <ActionIcon
          w="100%"
          size="xl"
          radius="md"
          c="white"
          variant="subtle"
          classNames={{ root: "sidebar-button-collapsed" }}
          style={{ marginTop: "auto" }}
        >
          <IconUserCircle size={28} stroke={1.5} />
        </ActionIcon>
      </Stack>
    );
  } else {
    //Expanded sidebar
    return (
      <Stack h="100%" bg="#1E1E1E" w="280px">
        <Stack h="auto" pl="md" pr="md" pt="md" pb="0px">
          <Flex justify="space-between" direction="row">
            <Text c="white" fz="36px" pb="64px">
              AT
            </Text>
            <ActionIcon
              variant="transparent"
              size="lg"
              c="dimmed"
              onClick={toggleCollapsed}
              bd="0"
            >
              <IconLayoutSidebar />
            </ActionIcon>
          </Flex>

          <Button
            fullWidth
            radius="md"
            c="white"
            p="md"
            h="auto"
            justify="space-between"
            rightSection={<IconSquarePlus size={28} stroke={1.5} />}
            fz="md"
            classNames={{ root: "sidebar-button" }}
          >
            Create Task
          </Button>

          <Text c="dimmed">Your Tasks</Text>
        </Stack>
        <ScrollArea h="auto" type="auto">
          <Stack pl="md" pr="md" pt="md" pb="0px">
            {[1, 2, 3, 4, 5].map((num) => ( //, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5
              <Button
                key={num}
                fullWidth
                radius="md"
                c="white"
                p="md"
                h="auto"
                justify="space-between"
                rightSection={<IconFile size={28} stroke={1.5} />}
                fz="md"
                classNames={{ root: "sidebar-button" }}
              >
                Task {num} Title
              </Button>
            ))}
          </Stack>
        </ScrollArea>
        <Button
          leftSection={<IconUserCircle size={28} stroke={1.5} />}
          style={{ marginTop: "auto" }}
          bg="#1C1A1A"
          radius="0px"
          p="lg"
          h="auto"
          fz="md"
          classNames={{ root: "sidebar-button" }}
        >
          {userState?.username}
        </Button>
      </Stack>
    );
  }
};

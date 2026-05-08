import { Badge, Box, Container, Grid, Group, Paper, Text, Tooltip, useMantineColorScheme } from "@mantine/core";
import PageIntro from "../../components/common/PageIntro";
import StepTrackerBanner from "../../components/StepTrackerBanner";
import styles from "./AIAnnotationPage.module.css";
import { AIReviewPanel } from "./components/AIReviewPanel";
import { CodebookPanel } from "./components/CodebookPanel";
import { MetricsModal } from "./components/MetricsModal";
import { useAIAnnotationController } from "./hooks/useAIAnnotationController";
import { ErrorStatus, LoadingStatus } from "./subpages/AIAnnotationStatusView";

export default function AnnotationPage() {
  const { colorScheme } = useMantineColorScheme();
  const isLight = colorScheme === "light";

  const mutedColor = isLight ? "#3b4750" : "dimmed";
  const surface = isLight ? "#ffffff" : "var(--app-surface)";
  const surface2 = isLight ? "#f4f7f9" : "var(--app-surface-2)";
  const surface3 = isLight ? "#eef3f5" : "var(--app-surface-3)";
  const panelBg = isLight ? "#f2f6f8" : "var(--app-panel)";
  const borderColor = isLight ? "rgba(15, 20, 24, 0.12)" : "var(--app-border)";
  const borderStrong = isLight ? "rgba(15, 20, 24, 0.18)" : "var(--app-border-strong)";

  const controller = useAIAnnotationController();

  if (controller.loading) {
    return <LoadingStatus isLight={isLight} message="Loading annotation data..." />;
  }

  if (controller.effectiveStatus === "sampling_pending") {
    return (
      <LoadingStatus
        isLight={isLight}
        message="Task created. Sampling is in progress. This page checks status once every minute."
      />
    );
  }

  if (controller.effectiveStatus === "sampling_error") {
    return (
      <ErrorStatus
        isLight={isLight}
        message={controller.samplingErrorMsg || "Sampling failed for this task."}
        onGoHome={controller.goHome}
      />
    );
  }

  if (!controller.task || !controller.isReady) {
    return (
      <ErrorStatus
        isLight={isLight}
        message="No data available for annotation"
        onGoHome={controller.goHome}
      />
    );
  }

  return (
    <Box
      className={styles.page}
      style={{ height: "100dvh", overflowX: "hidden", display: "flex", flexDirection: "column" }}
    >
      <div className={styles.orbOne} />
      <Container fluid className={styles.hero}>
        <StepTrackerBanner currentStep={2} activeSteps={[2]} onHelp={controller.handleHelp} />
        <Paper className={styles.taskHeader} radius="md">
          <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
            <div className={styles.taskInfo}>
              <Text className={styles.taskTitle} lineClamp={1}>
                Codebook Creation Task: {controller.task.name}
              </Text>
              <Text className={styles.taskDescription} lineClamp={2}>
                {controller.task.description}
              </Text>
            </div>
            <Group gap="xs" className={styles.taskMetrics} wrap="nowrap">
              <Tooltip
                label={`Current Accuracy: ${controller.totalAttempted > 0 ? Math.round((controller.totalCorrect / controller.totalAttempted) * 100) : 0}% (${controller.totalCorrect}/${controller.totalAttempted})`}
              >
                <Badge
                  variant="filled"
                  color={
                    controller.totalAttempted === 0
                      ? "gray"
                      : controller.totalCorrect / controller.totalAttempted > 0.8
                        ? "green"
                        : "orange"
                  }
                  size="xl"
                  fz="xs"
                  circle
                  style={{ border: `1px solid ${borderColor}` }}
                >
                  {controller.totalAttempted > 0
                    ? Math.round((controller.totalCorrect / controller.totalAttempted) * 100)
                    : "—"}
                </Badge>
              </Tooltip>
              <Tooltip label="Unseen Data Accuracy (Predicted)">
                <Badge
                  variant="outline"
                  color={
                    controller.predictedAccuracy === null
                      ? "gray"
                      : controller.predictedAccuracy > 0.8
                        ? "green"
                        : "orange"
                  }
                  size="xl"
                  fz="xs"
                  circle
                  style={{ border: `1px solid ${borderColor}` }}
                >
                  {controller.predictedAccuracy === null
                    ? "—"
                    : Math.round(controller.predictedAccuracy * 100)}
                </Badge>
              </Tooltip>
            </Group>
          </Group>
        </Paper>
      </Container>

      <Container fluid className={styles.tableSection}>
        <MetricsModal
          opened={controller.metricsModalOpen}
          isLight={isLight}
          files={controller.metricsFiles}
          onClose={() => controller.setMetricsModalOpen(false)}
          onDownload={controller.handleDownloadMetrics}
          onExportCodebook={controller.handleExportCodebookFromModal}
        />

        <PageIntro
          mode={controller.introShowCheckbox ? "firstRun" : "help"}
          opened={controller.introOpen}
          onClose={controller.handleCloseIntro}
          title="Step 2: AI annotation review"
          description="Review AI suggestions, mark them correct or incorrect, and add feedback to refine the live codebook. This step prepares the final guidance."
          storageKey="hideStep5Intro"
          showSecondaryAction={false}
          primaryOnlyLabel="Got it"
          showDontShowAgain={controller.introShowCheckbox}
          dontShowAgainChecked={controller.introDontShow}
          onDontShowAgainChange={controller.setIntroDontShow}
          onStart={controller.handleCloseIntro}
        />

        <Grid gutter="md" align="stretch" className={styles.annotationGrid}>
          <Grid.Col span={{ base: 12, md: 8 }} h="100%" className={styles.mainColumn}>
            <AIReviewPanel
              isLight={isLight}
              mutedColor={mutedColor}
              surface={surface}
              surface2={surface2}
              surface3={surface3}
              borderColor={borderColor}
              borderStrong={borderStrong}
              isLoading={controller.isLoading}
              currentBatchProgress={controller.currentBatchProgress}
              actualBatchSize={controller.actualBatchSize}
              currentIndex={controller.currentIndex}
              totalSamples={controller.totalSamples}
              currentBatchStartIndex={controller.currentBatchStartIndex}
              currentSampleText={controller.currentSampleText}
              generatedLabels={controller.generatedLabels}
              generatedSpanText={controller.generatedSpanText}
              generatedReasoning={controller.generatedReasoning}
              batchResult={controller.batchResults[controller.currentIndex]}
              spanTextFeedback={controller.spanTextFeedback}
              reasoningFeedback={controller.reasoningFeedback}
              labels={controller.task.labels || []}
              onPrev={controller.goPrev}
              onNext={controller.handleNextOrCommit}
              isCommitStep={controller.isCommitStep}
              isCompleteStep={controller.isCompleteStep}
              nextDisabled={controller.nextDisabled}
              onSetCorrect={controller.setCurrentCorrect}
              onSetSpanFeedback={controller.setSpanTextFeedback}
              onSetReasoningFeedback={controller.setReasoningFeedback}
              onSetCorrectLabel={controller.setCurrentCorrectLabel}
              onSetFeedback={controller.setCurrentFeedback}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }} h="100%" className={styles.sidebarColumn}>
            <CodebookPanel
              isLight={isLight}
              mutedColor={mutedColor}
              surface={surface}
              panelBg={panelBg}
              borderColor={borderColor}
              codebook={controller.codebook}
              stagedRules={controller.stagedRules}
              stagedRulesDeletion={controller.stagedRulesDeletion}
              newRule={controller.newRule}
              onNewRuleChange={controller.setNewRule}
              onAddRule={controller.addRule}
              onExport={controller.handleExportCodebook}
              onEditRule={controller.editRule}
              onToggleDeleteRule={controller.toggleDeleteRule}
              onRemoveStagedRule={controller.removeStagedRule}
            />
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );
}

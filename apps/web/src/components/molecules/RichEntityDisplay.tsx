/**
 * Rich entity display component with detailed, entity-specific information
 * Provides context-aware views for different OpenAlex entity types
 */

import React from "react";
import {
  Stack,
  Card,
  Group,
  Badge,
  Text,
  Title,
  Anchor,
  ThemeIcon,
  Timeline,
  Paper,
  NumberFormatter,
  ScrollArea,
} from "@mantine/core";
import {
  IconFile,
  IconUser,
  IconBook,
  IconBuilding,
  IconTag,
  IconBuildingStore,
  IconQuote,
  IconTrendingUp,
  IconEye,
  IconCalendar,
  IconWorld,
  IconStar,
  IconBolt,
  IconChartBar,
  IconUsers,
  IconSchool,
  IconMedal,
  IconTarget,
  IconMapPin,
  IconClock,
  IconDatabase,
  IconCode,
  IconFlask,
  IconAlertCircle,
  IconUserQuestion,
} from "@tabler/icons-react";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useEntityInteraction } from "@/hooks/use-entity-interaction";
import type { GraphNode } from "@academic-explorer/graph";
import type { Authorship, OpenAlexEntity, Work, Author, InstitutionEntity } from "@academic-explorer/types";
import { isWork, isAuthor, isInstitution } from "@academic-explorer/types";
import {
  getNodeYear,
  getNodeOpenAccess,
  getNodeCitationCount,
  getNodeWorkType,
  getNodeIsXpac,
  getNodeHasUnverifiedAuthor,
} from "@academic-explorer/graph";

interface RichEntityDisplayProps {
  entity: GraphNode;
}

export const RichEntityDisplay: React.FC<RichEntityDisplayProps> = ({
  entity,
}) => {
  const themeColors = useThemeColors();
  const { colors } = themeColors;
  const rawEntityData = useRawEntityData({
    options: {
      entityId: entity.entityId,
    },
  });
  const rawData = rawEntityData.data;
  const { isLoading } = rawEntityData;
  const entityInteraction = useEntityInteraction();
  const { handleSidebarEntityClick } = entityInteraction;

  const getEntityIcon = ({
    entityType,
    size = 20,
  }: {
    entityType: string;
    size?: number;
  }) => {
    const iconProps = { size };
    switch (entityType) {
      case "works":
        return <IconFile {...iconProps} />;
      case "authors":
        return <IconUser {...iconProps} />;
      case "sources":
        return <IconBook {...iconProps} />;
      case "institutions":
        return <IconBuilding {...iconProps} />;
      case "topics":
        return <IconTag {...iconProps} />;
      case "publishers":
        return <IconBuildingStore {...iconProps} />;
      default:
        return <IconTarget {...iconProps} />;
    }
  };

  const { getEntityColor } = themeColors;

  const formatNumber = (num: number | undefined | null) => {
    if (!num || num === 0) return "0";
    return num.toLocaleString();
  };

  const getWorkTypeIcon = (workType: string) => {
    const type = workType.toLowerCase();
    switch (type) {
      case "dataset":
        return <IconDatabase size={14} />;
      case "software":
        return <IconCode size={14} />;
      case "specimen":
        return <IconFlask size={14} />;
      case "other":
        return <IconAlertCircle size={14} />;
      default:
        return null;
    }
  };

  const getWorkTypeColor = (workType: string): string => {
    const type = workType.toLowerCase();
    switch (type) {
      case "dataset":
        return "cyan";
      case "software":
        return "violet";
      case "specimen":
        return "teal";
      case "other":
        return "orange";
      default:
        return "gray";
    }
  };

  const isXpacWorkType = (workType: string): boolean => {
    const xpacTypes = ["dataset", "software", "specimen", "other"];
    return xpacTypes.includes(workType.toLowerCase());
  };

  const handleEntityClick = ({
    entityId,
    entityType,
  }: {
    entityId: string;
    entityType: string;
  }) => {
    // Use shared entity interaction logic for consistent behavior
    void handleSidebarEntityClick({ entityId, entityType });
  };

  // Entity-specific rich content components
  const WorksDisplay = ({ work }: { work: OpenAlexEntity }) => {
    // Type guard to ensure this is actually a Work entity
    if (!isWork(work)) return null;
    const workEntity = work as Work;

    return (
      <Stack gap="md">
        {/* Publication Info */}
        <Card padding="md" radius="md" withBorder>
          <Group gap="xs" mb="sm">
            <ThemeIcon variant="light" size="sm" color="blue">
              <IconCalendar size={16} />
            </ThemeIcon>
            <Text size="sm" fw={600}>
              Publication Details
            </Text>
          </Group>

          <Group wrap="wrap" gap="sm">
            {workEntity.publication_year && (
              <Badge size="lg" variant="light" color="blue">
                {workEntity.publication_year}
              </Badge>
            )}
            {workEntity.type && (
              <Badge
                size="lg"
                variant="light"
                color={getWorkTypeColor(workEntity.type)}
                leftSection={getWorkTypeIcon(workEntity.type)}
                data-testid={
                  isXpacWorkType(workEntity.type)
                    ? "xpac-work-type-badge"
                    : "work-type-badge"
                }
              >
                {workEntity.type}
              </Badge>
            )}
            {workEntity.open_access?.is_oa && (
              <Badge size="lg" variant="light" color="green">
                Open Access
              </Badge>
            )}
          </Group>

          {workEntity.primary_location?.source && (
            <Group mt="sm" gap="xs">
              <Text size="xs" c="dimmed">
                Published in:
              </Text>
              <Anchor
                size="xs"
                fw={500}
                c={getEntityColor("sources")}
                onClick={() => {
                  if (workEntity.primary_location?.source?.id) {
                    handleEntityClick({
                      entityId: workEntity.primary_location.source.id,
                      entityType: "source",
                    });
                  }
                }}
              >
                {workEntity.primary_location.source.display_name}
              </Anchor>
            </Group>
          )}
        </Card>

        {/* Impact Metrics */}
        <Card padding="md" radius="md" withBorder>
          <Group gap="xs" mb="sm">
            <ThemeIcon variant="light" size="sm" color="red">
              <IconTrendingUp size={16} />
            </ThemeIcon>
            <Text size="sm" fw={600}>
              Impact Metrics
            </Text>
          </Group>

          <Group grow>
            <Paper p="xs" bg={colors.background.primary} radius="sm">
              <Group justify="center" gap="xs">
                <IconQuote size={16} color={colors.text.secondary} />
                <Stack gap={0} align="center">
                  <NumberFormatter
                    value={workEntity.cited_by_count || 0}
                    thousandSeparator
                    style={{ fontSize: "16px", fontWeight: 700 }}
                  />
                  <Text size="xs" c="dimmed">
                    Citations
                  </Text>
                </Stack>
              </Group>
            </Paper>

            <Paper p="xs" bg={colors.background.primary} radius="sm">
              <Group justify="center" gap="xs">
                <IconEye size={16} color={colors.text.secondary} />
                <Stack gap={0} align="center">
                  <NumberFormatter
                    value={workEntity.counts_by_year[0]?.cited_by_count || 0}
                    thousandSeparator
                    style={{ fontSize: "16px", fontWeight: 700 }}
                  />
                  <Text size="xs" c="dimmed">
                    Recent
                  </Text>
                </Stack>
              </Group>
            </Paper>
          </Group>
        </Card>

        {/* Authors */}
        {workEntity.authorships && workEntity.authorships.length > 0 && (
          <Card padding="md" radius="md" withBorder>
            <Group gap="xs" mb="sm">
              <ThemeIcon variant="light" size="sm" color="blue">
                <IconUsers size={16} />
              </ThemeIcon>
              <Text size="sm" fw={600}>
                Authors ({workEntity.authorships?.length || 0})
              </Text>
            </Group>

            <ScrollArea.Autosize mah={120}>
              <Stack gap="xs">
                {workEntity.authorships
                  ?.slice(0, 10)
                  .map((authorship, index: number) => {
                    const hasAuthorId = Boolean(authorship.author.id);
                    return (
                      <Group
                        key={
                          authorship.author.id || `authorship-${String(index)}`
                        }
                        gap="sm"
                        wrap="nowrap"
                      >
                        <Badge size="xs" variant="light">
                          {authorship.author_position}
                        </Badge>
                        <Group gap={4} wrap="nowrap">
                          <Anchor
                            size="xs"
                            c={
                              hasAuthorId
                                ? getEntityColor("authors")
                                : "dimmed"
                            }
                            style={{
                              cursor: hasAuthorId ? "pointer" : "default",
                            }}
                            onClick={() => {
                              if (authorship.author.id) {
                                handleEntityClick({
                                  entityId: authorship.author.id,
                                  entityType: "author",
                                });
                              }
                            }}
                          >
                            {authorship.author.display_name || "Unknown Author"}
                          </Anchor>
                          {!hasAuthorId && (
                            <ThemeIcon
                              size="xs"
                              color="orange"
                              variant="light"
                              title="Unverified author (no Author ID)"
                              data-testid="unverified-author-indicator"
                            >
                              <IconUserQuestion size={12} />
                            </ThemeIcon>
                          )}
                        </Group>
                        {authorship.institutions?.[0] && (
                          <Anchor
                            size="xs"
                            c={getEntityColor("institutions")}
                            truncate
                            style={{ maxWidth: 150, cursor: "pointer" }}
                            onClick={() => {
                              if (authorship.institutions?.[0]?.id) {
                                handleEntityClick({
                                  entityId: authorship.institutions[0].id,
                                  entityType: "institution",
                                });
                              }
                            }}
                          >
                            {authorship.institutions[0]?.display_name}
                          </Anchor>
                        )}
                      </Group>
                    );
                  })}
                {workEntity.authorships && workEntity.authorships.length > 10 && (
                  <Text size="xs" c="dimmed" ta="center">
                    ... and {workEntity.authorships.length - 10} more
                  </Text>
                )}
              </Stack>
            </ScrollArea.Autosize>
          </Card>
        )}

        {/* Topics/Keywords */}
        {workEntity.topics && workEntity.topics.length > 0 && (
          <Card padding="md" radius="md" withBorder>
            <Group gap="xs" mb="sm">
              <ThemeIcon variant="light" size="sm" color="violet">
                <IconTag size={16} />
              </ThemeIcon>
              <Text size="sm" fw={600}>
                Research Topics
              </Text>
            </Group>

            <Group gap="xs">
              {workEntity.topics.slice(0, 8).map((topic, index: number) => (
                <Badge
                  key={topic.id || `topic-${String(index)}`}
                  size="sm"
                  variant="light"
                  color={getEntityColor("topics")}

                  onClick={() => {
                    if (topic.id) {
                      handleEntityClick({
                        entityId: topic.id,
                        entityType: "topic",
                      });
                    }
                  }}
                >
                  {topic.display_name}
                </Badge>
              ))}
              {workEntity.topics.length > 8 && (
                <Text size="xs" c="dimmed">
                  +{workEntity.topics.length - 8} more
                </Text>
              )}
            </Group>
          </Card>
        )}
      </Stack>
    );
  };

  const AuthorsDisplay = ({ author }: { author: OpenAlexEntity }) => {
    // Type guard to ensure this is actually an Author entity
    if (!isAuthor(author)) return null;
    const authorEntity = author as Author;

    return (
      <Stack gap="md">
        {/* Academic Profile */}
        <Card padding="md" radius="md" withBorder>
          <Group gap="xs" mb="sm">
            <ThemeIcon variant="light" size="sm" color="blue">
              <IconSchool size={16} />
            </ThemeIcon>
            <Text size="sm" fw={600}>
              Academic Profile
            </Text>
          </Group>

          <Group wrap="wrap" gap="sm">
            {authorEntity.last_known_institutions &&
              authorEntity.last_known_institutions.length > 0 && (
                <Group gap="xs">
                  <IconBuilding size={14} />
                  <Anchor
                    size="sm"
                    c={getEntityColor("institutions")}

                    onClick={() => {
                      if (authorEntity.last_known_institutions?.[0]?.id) {
                        handleEntityClick({
                          entityId: authorEntity.last_known_institutions[0].id,
                          entityType: "institution",
                        });
                      }
                    }}
                  >
                    {authorEntity.last_known_institutions[0].display_name}
                  </Anchor>
                </Group>
              )}
            {authorEntity.works_count && (
              <Badge size="lg" variant="light" color="blue">
                {formatNumber(authorEntity.works_count)} works
              </Badge>
            )}
            {authorEntity.cited_by_count && (
              <Badge size="lg" variant="light" color="red">
                {formatNumber(authorEntity.cited_by_count)} citations
              </Badge>
            )}
          </Group>
        </Card>

        {/* Research Impact */}
        <Card padding="md" radius="md" withBorder>
          <Group gap="xs" mb="sm">
            <ThemeIcon variant="light" size="sm" color="orange">
              <IconMedal size={16} />
            </ThemeIcon>
            <Text size="sm" fw={600}>
              Research Impact
            </Text>
          </Group>

          <Group grow>
            <Paper p="xs" bg={colors.background.primary} radius="sm">
              <Group justify="center" gap="xs">
                <IconStar size={16} color={colors.text.secondary} />
                <Stack gap={0} align="center">
                  <Text fw={700} size="lg">
                    {authorEntity.summary_stats?.h_index || 0}
                  </Text>
                  <Text size="xs" c="dimmed">
                    H-Index
                  </Text>
                </Stack>
              </Group>
            </Paper>

            <Paper p="xs" bg={colors.background.primary} radius="sm">
              <Group justify="center" gap="xs">
                <IconBolt size={16} color={colors.text.secondary} />
                <Stack gap={0} align="center">
                  <Text fw={700} size="lg">
                    {authorEntity.summary_stats?.i10_index || 0}
                  </Text>
                  <Text size="xs" c="dimmed">
                    i10-Index
                  </Text>
                </Stack>
              </Group>
            </Paper>
          </Group>
        </Card>

        {/* Affiliations Timeline */}
        {authorEntity.affiliations && authorEntity.affiliations.length > 0 && (
          <Card padding="md" radius="md" withBorder>
            <Group gap="xs" mb="sm">
              <ThemeIcon variant="light" size="sm" color="orange">
                <IconBuilding size={16} />
              </ThemeIcon>
              <Text size="sm" fw={600}>
                Affiliations
              </Text>
            </Group>

            <Timeline active={0} bulletSize={20} lineWidth={2}>
              {authorEntity.affiliations
                ?.slice(0, 5)
                .map((affiliation, index: number) => (
                  <Timeline.Item
                    key={
                      affiliation.institution.id ||
                      `affiliation-${String(index)}`
                    }
                    bullet={<IconBuilding size={12} />}
                    title={
                      <Anchor
                        size="sm"
                        c={getEntityColor("institutions")}

                        onClick={() => {
                          if (affiliation.institution.id) {
                            handleEntityClick({
                              entityId: affiliation.institution.id,
                              entityType: "institution",
                            });
                          }
                        }}
                      >
                        {affiliation.institution.display_name}
                      </Anchor>
                    }
                  >
                    <Group gap="xs">
                      <Text size="xs" c="dimmed">
                        {affiliation.years[0]} -{" "}
                        {affiliation.years[affiliation.years.length - 1] ||
                          "present"}
                      </Text>
                      {affiliation.institution.country_code && (
                        <Badge size="xs" variant="light">
                          {affiliation.institution.country_code}
                        </Badge>
                      )}
                    </Group>
                  </Timeline.Item>
                ))}
            </Timeline>
          </Card>
        )}

        {/* Research Areas */}
        {authorEntity.topics && authorEntity.topics.length > 0 && (
          <Card padding="md" radius="md" withBorder>
            <Group gap="xs" mb="sm">
              <ThemeIcon variant="light" size="sm" color="violet">
                <IconTag size={16} />
              </ThemeIcon>
              <Text size="sm" fw={600}>
                Research Areas
              </Text>
            </Group>

            <Stack gap="xs">
              {authorEntity.topics.slice(0, 5).map((topic, index: number) => (
                <Group
                  key={topic.id || `author-topic-${String(index)}`}
                  justify="space-between"
                >
                  <Anchor
                    size="sm"
                    c={getEntityColor("topics")}

                    onClick={() => {
                      if (topic.id) {
                        handleEntityClick({
                          entityId: topic.id,
                          entityType: "topic",
                        });
                      }
                    }}
                  >
                    {topic.display_name}
                  </Anchor>
                  <Badge size="xs" variant="light">
                    {topic.count} works
                  </Badge>
                </Group>
              ))}
            </Stack>
          </Card>
        )}
      </Stack>
    );
  };

  const InstitutionsDisplay = ({
    institution,
  }: {
    institution: OpenAlexEntity;
  }) => {
    // Type guard to ensure this is actually an Institution entity
    if (!isInstitution(institution)) return null;
    const institutionEntity = institution as InstitutionEntity;

    return (
      <Stack gap="md">
        {/* Location & Overview */}
        <Card padding="md" radius="md" withBorder>
          <Group gap="xs" mb="sm">
            <ThemeIcon variant="light" size="sm" color="orange">
              <IconMapPin size={16} />
            </ThemeIcon>
            <Text size="sm" fw={600}>
              Location & Overview
            </Text>
          </Group>

          <Group wrap="wrap" gap="sm">
            {institutionEntity.geo.city && (
              <Group gap="xs">
                <IconWorld size={14} />
                <Text size="sm">
                  {institutionEntity.geo.city}, {institutionEntity.geo.country}
                </Text>
              </Group>
            )}
            {institutionEntity.type && (
              <Badge variant="light" color="orange">
                {institutionEntity.type}
              </Badge>
            )}
            {institutionEntity.homepage_url && (
              <Anchor size="sm" href={institutionEntity.homepage_url} target="_blank">
                Visit Website
              </Anchor>
            )}
          </Group>
        </Card>

        {/* Research Output */}
        <Card padding="md" radius="md" withBorder>
          <Group gap="xs" mb="sm">
            <ThemeIcon variant="light" size="sm" color="blue">
              <IconChartBar size={16} />
            </ThemeIcon>
            <Text size="sm" fw={600}>
              Research Output
            </Text>
          </Group>

          <Group grow>
            <Paper p="xs" bg={colors.background.primary} radius="sm">
              <Group justify="center" gap="xs">
                <IconFile size={16} color={colors.text.secondary} />
                <Stack gap={0} align="center">
                  <NumberFormatter
                    value={institutionEntity.works_count || 0}
                    thousandSeparator
                    style={{ fontSize: "16px", fontWeight: 700 }}
                  />
                  <Text size="xs" c="dimmed">
                    Works
                  </Text>
                </Stack>
              </Group>
            </Paper>

            <Paper p="xs" bg={colors.background.primary} radius="sm">
              <Group justify="center" gap="xs">
                <IconQuote size={16} color={colors.text.secondary} />
                <Stack gap={0} align="center">
                  <NumberFormatter
                    value={institutionEntity.cited_by_count || 0}
                    thousandSeparator
                    style={{ fontSize: "16px", fontWeight: 700 }}
                  />
                  <Text size="xs" c="dimmed">
                    Citations
                  </Text>
                </Stack>
              </Group>
            </Paper>
          </Group>
        </Card>

        {/* Associated Topics */}
        {institutionEntity.topics && institutionEntity.topics.length > 0 && (
          <Card padding="md" radius="md" withBorder>
            <Group gap="xs" mb="sm">
              <ThemeIcon variant="light" size="sm" color="violet">
                <IconTag size={16} />
              </ThemeIcon>
              <Text size="sm" fw={600}>
                Research Focus Areas
              </Text>
            </Group>

            <Stack gap="xs">
              {institutionEntity.topics.slice(0, 6).map((topic, index: number) => (
                <Group
                  key={topic.id || `institution-topic-${String(index)}`}
                  justify="space-between"
                >
                  <Anchor
                    size="sm"
                    c={getEntityColor("topics")}

                    onClick={() => {
                      if (topic.id) {
                        handleEntityClick({
                          entityId: topic.id,
                          entityType: "topic",
                        });
                      }
                    }}
                  >
                    {topic.display_name}
                  </Anchor>
                  <Badge size="xs" variant="light">
                    {topic.count} works
                  </Badge>
                </Group>
              ))}
            </Stack>
          </Card>
        )}
      </Stack>
    );
  };

  // Enhanced basic info card that works for all entity types
  const BasicInfoCard = () => (
    <Card
      padding="md"
      radius="md"
      withBorder
      style={{
        borderColor: `var(--mantine-color-${getEntityColor(entity.entityType)}-5)`,
        borderWidth: 2,
      }}
    >
      <Group align="flex-start" gap="md" mb="xs">
        <ThemeIcon
          size="xl"
          color={getEntityColor(entity.entityType)}
          variant="light"
        >
          {getEntityIcon({ entityType: entity.entityType, size: 24 })}
        </ThemeIcon>
        <Stack gap="xs" style={{ flex: 1 }}>
          <Group gap="xs" wrap="wrap">
            <Badge
              color={getEntityColor(entity.entityType)}
              variant="light"
              size="sm"
            >
              {entity.entityType.replace(/s$/, "").toUpperCase()}
            </Badge>
            {getNodeYear(entity) && (
              <Badge variant="light" color="gray" size="sm">
                {getNodeYear(entity)}
              </Badge>
            )}
            {getNodeOpenAccess(entity) && (
              <Badge variant="light" color="green" size="sm">
                Open Access
              </Badge>
            )}
          </Group>
          <Title
            order={4}
            size="sm"
            style={{ wordWrap: "break-word" }}
            data-testid="rich-entity-display-title"
          >
            {entity.label}
          </Title>
          {getNodeCitationCount(entity) !== undefined && (
            <Group gap="xs">
              <IconQuote size={14} />
              <Text size="xs" c="dimmed">
                {formatNumber(getNodeCitationCount(entity) ?? 0)} citations
              </Text>
            </Group>
          )}
        </Stack>
      </Group>

      <Text
        size="xs"
        c="dimmed"
        ff="monospace"
        p="xs"
        bg={colors.background.primary}
        style={{ borderRadius: 4, wordBreak: "break-all", marginTop: 8 }}
      >
        {entity.entityId}
      </Text>
    </Card>
  );

  return (
    <Stack gap="md">
      <BasicInfoCard />

      {!isLoading && rawData && (
        <>
          {entity.entityType === "works" && <WorksDisplay work={rawData} />}
          {entity.entityType === "authors" && (
            <AuthorsDisplay author={rawData} />
          )}
          {entity.entityType === "institutions" && (
            <InstitutionsDisplay institution={rawData} />
          )}
          {/* Add more entity types as needed */}
        </>
      )}

      {isLoading && (
        <Card padding="md" radius="md" withBorder>
          <Group gap="xs">
            <IconClock size={16} />
            <Text size="sm" c="dimmed">
              Loading detailed information...
            </Text>
          </Group>
        </Card>
      )}
    </Stack>
  );
};

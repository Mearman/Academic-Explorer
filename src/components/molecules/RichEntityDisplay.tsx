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
	ScrollArea
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
	IconClock
} from "@tabler/icons-react";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useEntityInteraction } from "@/hooks/use-entity-interaction";
import type { GraphNode } from "@/lib/graph/types";
import type { Authorship, OpenAlexEntity } from "@/lib/openalex/types";
import { isWork, isAuthor, isInstitution } from "@/lib/openalex/type-guards";

interface RichEntityDisplayProps {
	entity: GraphNode;
}

export const RichEntityDisplay: React.FC<RichEntityDisplayProps> = ({
	entity
}) => {
	const { colors } = useThemeColors();
	const { data: rawData, isLoading } = useRawEntityData({
		entityId: entity.entityId
	});
	const { handleSidebarEntityClick } = useEntityInteraction();

	const getEntityIcon = (type: string, size = 20) => {
		const iconProps = { size };
		switch (type) {
			case "works": return <IconFile {...iconProps} />;
			case "authors": return <IconUser {...iconProps} />;
			case "sources": return <IconBook {...iconProps} />;
			case "institutions": return <IconBuilding {...iconProps} />;
			case "topics": return <IconTag {...iconProps} />;
			case "publishers": return <IconBuildingStore {...iconProps} />;
			default: return <IconTarget {...iconProps} />;
		}
	};

	const getEntityColor = (type: string): string => {
		switch (type) {
			case "works": return "red";
			case "authors": return "blue";
			case "sources": return "green";
			case "institutions": return "orange";
			case "topics": return "violet";
			case "publishers": return "teal";
			default: return "gray";
		}
	};

	const formatNumber = (num: number | undefined | null) => {
		if (!num || num === 0) return "0";
		return num.toLocaleString();
	};

	const handleEntityClick = (entityId: string, entityType: string) => {
		// Use shared entity interaction logic for consistent behavior
		void handleSidebarEntityClick(entityId, entityType);
	};

	// Entity-specific rich content components
	const WorksDisplay = ({ work }: { work: OpenAlexEntity }) => {
		// Type guard to ensure this is actually a Work entity
		if (!isWork(work)) return null;

		return (
			<Stack gap="md">
				{/* Publication Info */}
				<Card padding="md" radius="md" withBorder>
					<Group gap="xs" mb="sm">
						<ThemeIcon variant="light" size="sm" color="blue">
							<IconCalendar size={16} />
						</ThemeIcon>
						<Text size="sm" fw={600}>Publication Details</Text>
					</Group>

					<Group wrap="wrap" gap="sm">
						{work.publication_year && (
							<Badge size="lg" variant="light" color="blue">
								{work.publication_year}
							</Badge>
						)}
						{work.type && (
							<Badge size="lg" variant="light" color="gray">
								{work.type}
							</Badge>
						)}
						{work.open_access.is_oa && (
							<Badge size="lg" variant="light" color="green">
								Open Access
							</Badge>
						)}
					</Group>

					{work.primary_location?.source && (
						<Group mt="sm" gap="xs">
							<Text size="xs" c="dimmed">Published in:</Text>
							<Anchor
								size="xs"
								fw={500}
								c={getEntityColor("sources")}
								style={{ cursor: "pointer" }}
								onClick={() => {
									if (work.primary_location?.source?.id) {
										handleEntityClick(work.primary_location.source.id, "source");
									}
								}}
							>
								{work.primary_location.source.display_name}
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
						<Text size="sm" fw={600}>Impact Metrics</Text>
					</Group>

					<Group grow>
						<Paper p="xs" bg="gray.0" radius="sm">
							<Group justify="center" gap="xs">
								<IconQuote size={16} color={colors.text.secondary} />
								<Stack gap={0} align="center">
									<NumberFormatter
										value={work.cited_by_count || 0}
										thousandSeparator
										style={{ fontSize: "16px", fontWeight: 700 }}
									/>
									<Text size="xs" c="dimmed">Citations</Text>
								</Stack>
							</Group>
						</Paper>

						<Paper p="xs" bg="gray.0" radius="sm">
							<Group justify="center" gap="xs">
								<IconEye size={16} color={colors.text.secondary} />
								<Stack gap={0} align="center">
									<NumberFormatter
										value={work.counts_by_year[0]?.cited_by_count || 0}
										thousandSeparator
										style={{ fontSize: "16px", fontWeight: 700 }}
									/>
									<Text size="xs" c="dimmed">Recent</Text>
								</Stack>
							</Group>
						</Paper>
					</Group>
				</Card>

				{/* Authors */}
				{work.authorships.length > 0 && (
					<Card padding="md" radius="md" withBorder>
						<Group gap="xs" mb="sm">
							<ThemeIcon variant="light" size="sm" color="blue">
								<IconUsers size={16} />
							</ThemeIcon>
							<Text size="sm" fw={600}>
							Authors ({work.authorships.length})
							</Text>
						</Group>

						<ScrollArea.Autosize mah={120}>
							<Stack gap="xs">
								{work.authorships.slice(0, 10).map((authorship: Authorship, index: number) => (
									<Group key={index} gap="sm" wrap="nowrap">
										<Badge size="xs" variant="light">
											{authorship.author_position}
										</Badge>
										<Anchor
											size="xs"
											c={getEntityColor("authors")}
											style={{ flex: 1, cursor: "pointer" }}
											onClick={() => {
												if (authorship.author.id) {
													handleEntityClick(authorship.author.id, "author");
												}
											}}
										>
											{authorship.author.display_name || "Unknown Author"}
										</Anchor>
										{authorship.institutions[0] && (
											<Anchor
												size="xs"
												c={getEntityColor("institutions")}
												truncate
												style={{ maxWidth: 150, cursor: "pointer" }}
												onClick={() => {
													if (authorship.institutions[0].id) {
														handleEntityClick(authorship.institutions[0].id, "institution");
													}
												}}
											>
												{authorship.institutions[0].display_name}
											</Anchor>
										)}
									</Group>
								))}
								{work.authorships.length > 10 && (
									<Text size="xs" c="dimmed" ta="center">
									... and {work.authorships.length - 10} more
									</Text>
								)}
							</Stack>
						</ScrollArea.Autosize>
					</Card>
				)}

				{/* Topics/Keywords */}
				{work.topics && work.topics.length > 0 && (
					<Card padding="md" radius="md" withBorder>
						<Group gap="xs" mb="sm">
							<ThemeIcon variant="light" size="sm" color="violet">
								<IconTag size={16} />
							</ThemeIcon>
							<Text size="sm" fw={600}>Research Topics</Text>
						</Group>

						<Group gap="xs">
							{work.topics.slice(0, 8).map((topic, index: number) => (
								<Badge
									key={index}
									size="sm"
									variant="light"
									color={getEntityColor("topics")}
									style={{ cursor: "pointer" }}
									onClick={() => {
										if (topic.id) {
											handleEntityClick(topic.id, "topic");
										}
									}}
								>
									{topic.display_name}
								</Badge>
							))}
							{work.topics.length > 8 && (
								<Text size="xs" c="dimmed">
								+{work.topics.length - 8} more
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

		return (
			<Stack gap="md">
				{/* Academic Profile */}
				<Card padding="md" radius="md" withBorder>
					<Group gap="xs" mb="sm">
						<ThemeIcon variant="light" size="sm" color="blue">
							<IconSchool size={16} />
						</ThemeIcon>
						<Text size="sm" fw={600}>Academic Profile</Text>
					</Group>

					<Group wrap="wrap" gap="sm">
						{author.last_known_institutions && author.last_known_institutions.length > 0 && (
							<Group gap="xs">
								<IconBuilding size={14} />
								<Anchor
									size="sm"
									c={getEntityColor("institutions")}
									style={{ cursor: "pointer" }}
									onClick={() => {
										if (author.last_known_institutions?.[0]?.id) {
											handleEntityClick(author.last_known_institutions[0].id, "institution");
										}
									}}
								>
									{author.last_known_institutions[0].display_name}
								</Anchor>
							</Group>
						)}
						{author.works_count && (
							<Badge size="lg" variant="light" color="blue">
								{formatNumber(author.works_count)} works
							</Badge>
						)}
						{author.cited_by_count && (
							<Badge size="lg" variant="light" color="red">
								{formatNumber(author.cited_by_count)} citations
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
						<Text size="sm" fw={600}>Research Impact</Text>
					</Group>

					<Group grow>
						<Paper p="xs" bg="gray.0" radius="sm">
							<Group justify="center" gap="xs">
								<IconStar size={16} color={colors.text.secondary} />
								<Stack gap={0} align="center">
									<Text fw={700} size="lg">
										{author.summary_stats.h_index || 0}
									</Text>
									<Text size="xs" c="dimmed">H-Index</Text>
								</Stack>
							</Group>
						</Paper>

						<Paper p="xs" bg="gray.0" radius="sm">
							<Group justify="center" gap="xs">
								<IconBolt size={16} color={colors.text.secondary} />
								<Stack gap={0} align="center">
									<Text fw={700} size="lg">
										{author.summary_stats.i10_index || 0}
									</Text>
									<Text size="xs" c="dimmed">i10-Index</Text>
								</Stack>
							</Group>
						</Paper>
					</Group>
				</Card>

				{/* Affiliations Timeline */}
				{author.affiliations.length > 0 && (
					<Card padding="md" radius="md" withBorder>
						<Group gap="xs" mb="sm">
							<ThemeIcon variant="light" size="sm" color="orange">
								<IconBuilding size={16} />
							</ThemeIcon>
							<Text size="sm" fw={600}>Affiliations</Text>
						</Group>

						<Timeline active={0} bulletSize={20} lineWidth={2}>
							{author.affiliations.slice(0, 5).map((affiliation, index: number) => (
								<Timeline.Item
									key={index}
									bullet={<IconBuilding size={12} />}
									title={
										<Anchor
											size="sm"
											c={getEntityColor("institutions")}
											style={{ cursor: "pointer" }}
											onClick={() => {
												if (affiliation.institution.id) {
													handleEntityClick(affiliation.institution.id, "institution");
												}
											}}
										>
											{affiliation.institution.display_name}
										</Anchor>
									}
								>
									<Group gap="xs">
										<Text size="xs" c="dimmed">
											{affiliation.years[0]} - {affiliation.years[affiliation.years.length - 1] || "present"}
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
				{author.topics && author.topics.length > 0 && (
					<Card padding="md" radius="md" withBorder>
						<Group gap="xs" mb="sm">
							<ThemeIcon variant="light" size="sm" color="violet">
								<IconTag size={16} />
							</ThemeIcon>
							<Text size="sm" fw={600}>Research Areas</Text>
						</Group>

						<Stack gap="xs">
							{author.topics.slice(0, 5).map((topic, index: number) => (
								<Group key={index} justify="space-between">
									<Anchor
										size="sm"
										c={getEntityColor("topics")}
										style={{ cursor: "pointer" }}
										onClick={() => {
											if (topic.id) {
												handleEntityClick(topic.id, "topic");
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

	const InstitutionsDisplay = ({ institution }: { institution: OpenAlexEntity }) => {
		// Type guard to ensure this is actually an Institution entity
		if (!isInstitution(institution)) return null;

		return (
			<Stack gap="md">
				{/* Location & Overview */}
				<Card padding="md" radius="md" withBorder>
					<Group gap="xs" mb="sm">
						<ThemeIcon variant="light" size="sm" color="orange">
							<IconMapPin size={16} />
						</ThemeIcon>
						<Text size="sm" fw={600}>Location & Overview</Text>
					</Group>

					<Group wrap="wrap" gap="sm">
						{institution.geo.city && (
							<Group gap="xs">
								<IconWorld size={14} />
								<Text size="sm">
									{institution.geo.city}, {institution.geo.country}
								</Text>
							</Group>
						)}
						{institution.type && (
							<Badge variant="light" color="orange">
								{institution.type}
							</Badge>
						)}
						{institution.homepage_url && (
							<Anchor size="sm" href={institution.homepage_url} target="_blank">
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
						<Text size="sm" fw={600}>Research Output</Text>
					</Group>

					<Group grow>
						<Paper p="xs" bg="gray.0" radius="sm">
							<Group justify="center" gap="xs">
								<IconFile size={16} color={colors.text.secondary} />
								<Stack gap={0} align="center">
									<NumberFormatter
										value={institution.works_count || 0}
										thousandSeparator
										style={{ fontSize: "16px", fontWeight: 700 }}
									/>
									<Text size="xs" c="dimmed">Works</Text>
								</Stack>
							</Group>
						</Paper>

						<Paper p="xs" bg="gray.0" radius="sm">
							<Group justify="center" gap="xs">
								<IconQuote size={16} color={colors.text.secondary} />
								<Stack gap={0} align="center">
									<NumberFormatter
										value={institution.cited_by_count || 0}
										thousandSeparator
										style={{ fontSize: "16px", fontWeight: 700 }}
									/>
									<Text size="xs" c="dimmed">Citations</Text>
								</Stack>
							</Group>
						</Paper>
					</Group>
				</Card>

				{/* Associated Topics */}
				{institution.topics && institution.topics.length > 0 && (
					<Card padding="md" radius="md" withBorder>
						<Group gap="xs" mb="sm">
							<ThemeIcon variant="light" size="sm" color="violet">
								<IconTag size={16} />
							</ThemeIcon>
							<Text size="sm" fw={600}>Research Focus Areas</Text>
						</Group>

						<Stack gap="xs">
							{institution.topics.slice(0, 6).map((topic, index: number) => (
								<Group key={index} justify="space-between">
									<Anchor
										size="sm"
										c={getEntityColor("topics")}
										style={{ cursor: "pointer" }}
										onClick={() => {
											if (topic.id) {
												handleEntityClick(topic.id, "topic");
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
		<Card padding="md" radius="md" withBorder style={{ borderColor: `var(--mantine-color-${getEntityColor(entity.type)}-5)`, borderWidth: 2 }}>
			<Group align="flex-start" gap="md" mb="xs">
				<ThemeIcon size="xl" color={getEntityColor(entity.type)} variant="light">
					{getEntityIcon(entity.type, 24)}
				</ThemeIcon>
				<Stack gap="xs" style={{ flex: 1 }}>
					<Group gap="xs" wrap="wrap">
						<Badge color={getEntityColor(entity.type)} variant="light" size="sm">
							{entity.type.replace(/s$/, "").toUpperCase()}
						</Badge>
						{entity.metadata?.year && (
							<Badge variant="light" color="gray" size="sm">
								{entity.metadata.year}
							</Badge>
						)}
						{entity.metadata?.openAccess && (
							<Badge variant="light" color="green" size="sm">
								Open Access
							</Badge>
						)}
					</Group>
					<Title order={4} size="sm" style={{ wordWrap: "break-word" }}>
						{entity.label}
					</Title>
					{entity.metadata?.citationCount !== undefined && (
						<Group gap="xs">
							<IconQuote size={14} />
							<Text size="xs" c="dimmed">
								{formatNumber(entity.metadata.citationCount)} citations
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
				bg="gray.0"
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
					{entity.type === "works" && <WorksDisplay work={rawData} />}
					{entity.type === "authors" && <AuthorsDisplay author={rawData} />}
					{entity.type === "institutions" && <InstitutionsDisplay institution={rawData} />}
					{/* Add more entity types as needed */}
				</>
			)}

			{isLoading && (
				<Card padding="md" radius="md" withBorder>
					<Group gap="xs">
						<IconClock size={16} />
						<Text size="sm" c="dimmed">Loading detailed information...</Text>
					</Group>
				</Card>
			)}
		</Stack>
	);
};

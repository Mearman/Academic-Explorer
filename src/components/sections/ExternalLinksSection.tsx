/**
 * External Links Section
 * Provides links to external resources and services
 */

import React from "react";
import { IconExternalLink, IconLink, IconFileText, IconSchool } from "@tabler/icons-react";
import { Button, Divider, Text } from "@mantine/core";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { CollapsibleSection } from "@/components/molecules/CollapsibleSection";
import { useLayoutStore } from "@/stores/layout-store";
import { useGraphStore } from "@/stores/graph-store";
import { logger } from "@/lib/logger";
import type { GraphNode } from "@/lib/graph/types";

interface ExternalLinksSectionProps {
	className?: string;
}

export const ExternalLinksSection: React.FC<ExternalLinksSectionProps> = ({
	className = ""
}) => {
	const themeColors = useThemeColors();
	const colors = themeColors.colors;

	// Get entity to display - priority: hovered > selected > preview
	const hoveredNodeId = useGraphStore((state) => state.hoveredNodeId);
	const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
	const previewEntityId = useLayoutStore((state) => state.previewEntityId);

	// Get entity data from store
	const nodesMap = useGraphStore((state) => state.nodes);

	// Determine which entity to show
	const displayEntityId = hoveredNodeId || selectedNodeId || previewEntityId;
	const entityNode = displayEntityId ? nodesMap[displayEntityId] : null;

	const handleLinkClick = (url: string, linkType: string) => {
		logger.info("ui", `Opening external link: ${linkType}`, {
			url,
			entityId: displayEntityId,
			linkType
		});
		window.open(url, "_blank", "noopener,noreferrer");
	};

	const generateLinks = (entity: GraphNode) => {
		const links: Array<{
			label: string;
			url: string;
			icon: React.ReactNode;
			description: string;
			type: string;
		}> = [];

		// OpenAlex link (always available if we have an entity)
		if (entity.id) {
			links.push({
				label: "View in OpenAlex",
				url: `https://openalex.org/${entity.id}`,
				icon: <IconSchool size={16} />,
				description: "Open in OpenAlex database",
				type: "openalex"
			});
		}

		// DOI link for works - access entityData safely
		const entityData = entity.entityData;
		if (entity.type === "WORK" && entityData?.doi) {
			const doiUrl = entityData.doi as string;
			links.push({
				label: "DOI Resolver",
				url: doiUrl,
				icon: <IconFileText size={16} />,
				description: "View full article via DOI",
				type: "doi"
			});
		}

		// ORCID link for authors
		if (entity.type === "AUTHOR" && entityData?.orcid) {
			const orcidUrl = entityData.orcid as string;
			links.push({
				label: "ORCID Profile",
				url: orcidUrl,
				icon: <IconExternalLink size={16} />,
				description: "View ORCID researcher profile",
				type: "orcid"
			});
		}

		// Homepage/website links
		if (entityData?.homepage_url) {
			const homepageUrl = entityData.homepage_url as string;
			try {
				const domain = new URL(homepageUrl).hostname;
				links.push({
					label: `Visit ${domain}`,
					url: homepageUrl,
					icon: <IconLink size={16} />,
					description: "Official website",
					type: "homepage"
				});
			} catch {
				// Invalid URL, skip
			}
		}

		// Publisher website for sources
		if (entity.type === "SOURCE" && entityData?.homepage_url) {
			const publisherUrl = entityData.homepage_url as string;
			links.push({
				label: "Publisher Website",
				url: publisherUrl,
				icon: <IconLink size={16} />,
				description: "View publisher's website",
				type: "publisher"
			});
		}

		// Wikipedia link
		const ids = entityData?.ids as Record<string, unknown> | undefined;
		if (ids?.wikipedia) {
			const wikipediaUrl = ids.wikipedia as string;
			links.push({
				label: "Wikipedia",
				url: wikipediaUrl,
				icon: <IconExternalLink size={16} />,
				description: "View Wikipedia article",
				type: "wikipedia"
			});
		}

		// Wikidata link
		if (ids?.wikidata) {
			const wikidataUrl = ids.wikidata as string;
			links.push({
				label: "Wikidata",
				url: wikidataUrl,
				icon: <IconExternalLink size={16} />,
				description: "View Wikidata entry",
				type: "wikidata"
			});
		}

		return links;
	};

	if (!displayEntityId || !entityNode) {
		return (
			<div
				className={className}
				style={{
					padding: "24px",
					textAlign: "center",
					color: colors.text.secondary
				}}
			>
				<IconExternalLink
					size={48}
					style={{
						opacity: 0.3,
						marginBottom: "12px"
					}}
				/>
				<div style={{
					fontSize: "14px",
					fontWeight: 500,
					marginBottom: "8px"
				}}>
					No Entity Selected
				</div>
				<div style={{
					fontSize: "12px",
					opacity: 0.7,
					lineHeight: 1.4
				}}>
					Select an entity to view external links and resources
				</div>
			</div>
		);
	}

	const links = generateLinks(entityNode);

	if (links.length === 0) {
		return (
			<div className={className} style={{ padding: "16px" }}>
				<div style={{
					fontSize: "14px",
					fontWeight: 600,
					marginBottom: "12px",
					color: colors.text.primary,
					display: "flex",
					alignItems: "center",
					gap: "8px"
				}}>
					<IconExternalLink size={16} />
					External Links
				</div>

				<div style={{
					padding: "20px",
					textAlign: "center",
					color: colors.text.secondary,
					backgroundColor: colors.background.secondary,
					borderRadius: "8px"
				}}>
					<Text size="sm" c="dimmed">
						No external links available for this entity
					</Text>
				</div>
			</div>
		);
	}

	return (
		<div className={className} style={{ padding: "16px" }}>
			<div style={{
				fontSize: "14px",
				fontWeight: 600,
				marginBottom: "12px",
				color: colors.text.primary,
				display: "flex",
				alignItems: "center",
				gap: "8px"
			}}>
				<IconExternalLink size={16} />
				External Links
			</div>

			{/* Academic Resources */}
			<CollapsibleSection
				title="Academic Resources"
				icon={<IconSchool size={14} />}
				defaultExpanded={true}
				storageKey="external-links-academic"
			>
				<div style={{ marginTop: "12px" }}>
					{links.filter(link => ["openalex", "doi", "orcid"].includes(link.type)).map((link) => (
						<div key={link.type} style={{ marginBottom: "8px" }}>
							<Button
								variant="light"
								size="sm"
								leftSection={link.icon}
								rightSection={<IconExternalLink size={12} />}
								onClick={() => { handleLinkClick(link.url, link.type); }}
								style={{
									width: "100%",
									justifyContent: "flex-start",
									height: "auto",
									padding: "8px 12px"
								}}
							>
								<div style={{ textAlign: "left" }}>
									<div style={{ fontWeight: 500 }}>{link.label}</div>
									<Text size="xs" c="dimmed" style={{ marginTop: "2px" }}>
										{link.description}
									</Text>
								</div>
							</Button>
						</div>
					))}
				</div>
			</CollapsibleSection>

			{links.filter(link => !["openalex", "doi", "orcid"].includes(link.type)).length > 0 && (
				<>
					<Divider style={{ margin: "16px 0" }} />

					{/* Web Resources */}
					<CollapsibleSection
						title="Web Resources"
						icon={<IconLink size={14} />}
						defaultExpanded={false}
						storageKey="external-links-web"
					>
						<div style={{ marginTop: "12px" }}>
							{links.filter(link => !["openalex", "doi", "orcid"].includes(link.type)).map((link) => (
								<div key={link.type} style={{ marginBottom: "8px" }}>
									<Button
										variant="light"
										size="sm"
										leftSection={link.icon}
										rightSection={<IconExternalLink size={12} />}
										onClick={() => { handleLinkClick(link.url, link.type); }}
										style={{
											width: "100%",
											justifyContent: "flex-start",
											height: "auto",
											padding: "8px 12px"
										}}
									>
										<div style={{ textAlign: "left" }}>
											<div style={{ fontWeight: 500 }}>{link.label}</div>
											<Text size="xs" c="dimmed" style={{ marginTop: "2px" }}>
												{link.description}
											</Text>
										</div>
									</Button>
								</div>
							))}
						</div>
					</CollapsibleSection>
				</>
			)}

			{/* Usage Tips */}
			<div style={{
				marginTop: "16px",
				padding: "12px",
				backgroundColor: colors.background.secondary,
				borderRadius: "6px"
			}}>
				<Text size="xs" c="dimmed" style={{ marginBottom: "8px" }}>
					Tips
				</Text>
				<Text size="xs" c="dimmed">
					• Links open in new tabs for easy reference<br />
					• Academic resources provide authoritative data<br />
					• Web resources offer additional context
				</Text>
			</div>
		</div>
	);
};
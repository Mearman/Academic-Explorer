import { ReactNode } from "react";

export interface RichEntityViewProps {
	entity: any;
	entityType: string;
	fields: string[];
	viewMode: "compact" | "detailed" | "raw";
	loading?: boolean;
	error?: string | null;
	className?: string;
	children?: ReactNode;
}

export function RichEntityView({
	entity,
	entityType,
	fields,
	viewMode,
	loading = false,
	error = null,
	className,
	children,
}: RichEntityViewProps) {
	if (loading) {
		return <div className={`rich-entity-view loading ${className || ""}`}>Loading...</div>;
	}

	if (error) {
		return <div className={`rich-entity-view error ${className || ""}`}>Error: {error}</div>;
	}

	if (!entity) {
		return <div className={`rich-entity-view empty ${className || ""}`}>No entity data</div>;
	}

	return (
		<div className={`rich-entity-view ${viewMode} ${className || ""}`}>
			<div className="entity-header">
				<h2>{entity.display_name || entity.title || "Unknown Entity"}</h2>
				<span className="entity-type">{entityType}</span>
			</div>

			<div className="entity-content">
				{viewMode === "compact" && (
					<div className="compact-view">
						{entity.display_name && <p>{entity.display_name}</p>}
						{entity.description && <p>{entity.description}</p>}
					</div>
				)}

				{viewMode === "detailed" && (
					<div className="detailed-view">
						{fields.map(field => (
							<div key={field} className="field">
								<span className="field-label">{field}:</span>
								<span className="field-value">{String(entity[field] || "N/A")}</span>
							</div>
						))}
					</div>
				)}

				{viewMode === "raw" && (
					<pre className="raw-view">
						{JSON.stringify(entity, null, 2)}
					</pre>
				)}
			</div>

			{children}
		</div>
	);
}

export * from "./matchers";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/authors/$authorId")({
	component: AuthorRoute,
});

function AuthorRoute() {
 	const { authorId } = Route.useParams();

	return (
		<div style={{ padding: '20px' }}>
			<h1>🎓 Author Page - Simple Test</h1>
			<p><strong>Author ID:</strong> {authorId}</p>
			<p>This is a simplified author route to test React 19 compatibility.</p>
			<p>Graph loading has been temporarily disabled to isolate infinite loop issues.</p>
			<details>
				<summary>Next Steps</summary>
				<ul>
					<li>Test basic routing works ✅</li>
					<li>Progressively add back components</li>
					<li>Identify specific infinite loop sources</li>
					<li>Fix computed value caching issues</li>
					<li>Restore full graph functionality</li>
				</ul>
			</details>
		</div>
	);
}
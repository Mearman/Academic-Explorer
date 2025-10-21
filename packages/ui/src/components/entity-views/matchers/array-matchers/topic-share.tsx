import { Anchor, Badge, Table, Text } from "@mantine/core"
import React from "react"
import type { ArrayMatcher } from "../types"

export const topicShareMatcher: ArrayMatcher = {
	name: "topic-share",
	priority: 9,
	detect(array: unknown[]): boolean {
		if (!Array.isArray(array) || array.length === 0) {
			return false
		}

		const first = array[0]
		return (
			typeof first === "object" &&
			first !== null &&
			"id" in first &&
			"display_name" in first &&
			"value" in first &&
			"subfield" in first &&
			"field" in first &&
			"domain" in first
		)
	},
	render(array: unknown[], fieldName: string, onNavigate?: (path: string) => void): React.ReactNode {
		const topicArray = array as Array<{
			id: string
			display_name: string
			value: number
			subfield: { display_name: string }
			field: { display_name: string }
			domain: { display_name: string }
		}>
		return (
			<>
				<Table striped withTableBorder>
					<Table.Thead>
						<Table.Tr>
							<Table.Th>Topic</Table.Th>
							<Table.Th>Share</Table.Th>
							<Table.Th>Subfield</Table.Th>
							<Table.Th>Field</Table.Th>
							<Table.Th>Domain</Table.Th>
						</Table.Tr>
					</Table.Thead>
					<Table.Tbody>
						{topicArray
							.sort((a, b) => (b.value || 0) - (a.value || 0))
							.map((topic, index) => (
								<Table.Tr key={topic.id || index}>
									<Table.Td>
										{onNavigate && topic.id && topic.id.startsWith("T") ? (
											<Anchor
												href={`#/topics/${topic.id}`}
												size="sm"
												fw={500}
												onClick={(e) => {
													e.preventDefault()
													onNavigate(`/topics/${topic.id}`)
												}}
											>
												{topic.display_name}
											</Anchor>
										) : (
											<Text size="sm" fw={500}>
												{topic.display_name}
											</Text>
										)}
									</Table.Td>
									<Table.Td>
										<Badge variant="light" color="blue" size="sm">
											{(topic.value * 1_000_000).toFixed()}%
										</Badge>
									</Table.Td>
									<Table.Td>
										<Text size="xs" c="dimmed">
											{topic.subfield?.display_name}
										</Text>
									</Table.Td>
									<Table.Td>
										<Text size="xs" c="dimmed">
											{topic.field?.display_name}
										</Text>
									</Table.Td>
									<Table.Td>
										<Text size="xs" c="dimmed">
											{topic.domain?.display_name}
										</Text>
									</Table.Td>
								</Table.Tr>
							))}
					</Table.Tbody>
				</Table>
			</>
		)
	},
}

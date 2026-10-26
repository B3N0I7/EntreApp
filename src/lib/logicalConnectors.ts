import logicalConnectorData from './data/logicalConnectors.json';

export type LogicalConnector = {
	name: string;
	usage: string;
	examples: readonly string[];
};

export type LogicalConnectorCategory = {
	id: string;
	title: string;
	connectors: readonly LogicalConnector[];
};

export const LOGICAL_CONNECTOR_CATEGORIES =
	logicalConnectorData as readonly LogicalConnectorCategory[];

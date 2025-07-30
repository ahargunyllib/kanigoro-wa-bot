export type Service = {
  key: number;
  title: string;
  children: ServiceChild[];
};

export type ServiceChild = {
  key: string;
  title: string;
  requirements: string[];
};

export type BotState = {
  currentService?: number;
  awaitingInput?: boolean;
};

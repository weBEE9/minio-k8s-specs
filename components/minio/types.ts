type DeploymentConfig = {
  image: string;
};

type MinioEnvironment = {
  namespace: string;
  deployments: DeploymentConfig[];
  resources: {
    requests: {
      cpu: string;
      memory: string;
    };
    limits: {
      cpu: string;
      memory: string;
    };
  };
};

export { MinioEnvironment, DeploymentConfig };

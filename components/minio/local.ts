import type { MinioEnvironment } from './types';

const localMinioEnvironment: MinioEnvironment = {
  namespace: 'default',
  deployments: [
    {
      // 'minio/minio:20241002'
      image: process.env.MINIO_IMAGE || '',
    },
  ],
  resources: {
    requests: {
      cpu: '1000m',
      memory: '512Mi',
    },
    limits: {
      cpu: '2000m',
      memory: '1Gi',
    },
  },
};

export default localMinioEnvironment;

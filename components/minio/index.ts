import {
  Namespace,
  PersistentVolume,
  PersistentVolumeClaim,
  Service,
  ServiceAccount,
} from 'kubernetes-models/v1';
import { StatefulSet } from 'kubernetes-models/apps/v1';
import env from '@kosko/env';

import type { MinioEnvironment, DeploymentConfig } from './types';
import { StorageClass } from 'kubernetes-models/storage.k8s.io/v1';

const params = env.component('minio') as MinioEnvironment;
if (Object.keys(params).length === 0) {
  throw new Error('Please specify the component environment variables');
}

const name = 'minio';
const namespace = 'minio';

const ns = new Namespace({
  metadata: {
    name: namespace,
    namespace: namespace,
  },
});

const storageClassName = 'local-storage-class';
const storageClass = new StorageClass({
  metadata: {
    name: storageClassName,
  },
  provisioner: 'kubernetes.io/no-provisioner',
});

const persistentVolumeName = name + '-persistent-volume';
const persistentVolume = new PersistentVolume({
  metadata: {
    name: persistentVolumeName,
  },
  spec: {
    persistentVolumeReclaimPolicy: 'Retain',
    accessModes: ['ReadWriteOnce'],
    capacity: {
      storage: '2Gi',
    },
    hostPath: {
      path: '/mnt/data/minio',
    },
  },
});

const persistentVolumeClaimName = name + '-persistent-volume-claim';
const persistentVolumeClaim = new PersistentVolumeClaim({
  metadata: {
    name: persistentVolumeClaimName,
    namespace: namespace,
  },
  spec: {
    accessModes: ['ReadWriteOnce'],
    resources: {
      requests: {
        storage: '2Gi',
      },
    },
  },
});

const serviceAccountName = name + '-service-account';
const serviceAccount = new ServiceAccount({
  metadata: {
    name: serviceAccountName,
    namespace: namespace,
  },
});

function deployment(config: DeploymentConfig) {
  const serviceName = name + '-service';
  const service = new Service({
    metadata: {
      name: serviceName,
      namespace: namespace,
    },
    spec: {
      selector: {
        app: name,
      },
      ports: [
        {
          name: 'minio',
          port: 9000,
          targetPort: 9000,
        },
        {
          name: 'minio-console',
          port: 9001,
          targetPort: 9001,
        },
      ],
    },
  });

  const statefulSetName = name + '-stateful-set';
  const statefulSet = new StatefulSet({
    metadata: {
      name: statefulSetName,
      namespace: namespace,
    },
    spec: {
      selector: {
        matchLabels: {
          app: name,
        },
      },
      serviceName: serviceName,
      template: {
        metadata: {
          labels: {
            app: name,
          },
        },
        spec: {
          containers: [
            {
              name: name + '-container',
              image: config.image,
              imagePullPolicy: 'IfNotPresent',
              ports: [
                {
                  containerPort: 9000,
                  name: 'minio',
                },
                {
                  containerPort: 9001,
                  name: 'minio-console',
                },
              ],
              env: [
                {
                  name: 'MINIO_BROWSER_LOGIN_ANIMATION',
                  value: 'off',
                },
                // Uncomment the following lines to set the root username and password
                // {
                //   name: 'MINIO_ROOT_USER',
                //   value: '<your_username>',
                // },
                // {
                //   name: 'MINIO_ROOT_PASSWORD',
                //   value: '<your_password>',
                // },
              ],
              command: [
                'minio',
                'server',
                '--console-address',
                ':9001',
                '/data',
              ],
              resources: {
                requests: params.resources.requests,
                limits: params.resources.limits,
              },
              volumeMounts: [
                {
                  name: 'minio-persistent-storage',
                  mountPath: '/data',
                },
              ],
              lifecycle: {
                postStart: {
                  exec: {
                    command: [
                      '/bin/sh',
                      '-c',
                      // TODO: should make root and added user's username and password configurable,
                      // and needs to set policy to added user
                      'sleep 3 && mc alias set local http://localhost:9000 minioadmin minioadmin && mc admin user add local localminio localminio',
                    ],
                  },
                },
              },
            },
          ],
          volumes: [
            {
              name: 'minio-persistent-storage',
              persistentVolumeClaim: {
                claimName: persistentVolumeClaimName,
              },
            },
          ],
        },
      },
    },
  });

  return [service, statefulSet];
}

export default [
  ns,
  storageClass,
  persistentVolume,
  persistentVolumeClaim,
  serviceAccount,
  ...params.deployments
    .filter((c) => c.image !== '')
    .map((c: DeploymentConfig) => deployment(c)),
];

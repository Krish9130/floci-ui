import {CloudAdapterRegistry} from './registry/CloudAdapterRegistry'
import {AwsComputeAdapter} from './adapter-aws/AwsComputeAdapter'
import {AwsNetworkingAdapter} from './adapter-aws/AwsNetworkingAdapter'
import {AwsDatabaseAdapter} from './adapter-aws/AwsDatabaseAdapter'
import {AwsEksAdapter} from './adapter-aws/AwsEksAdapter'
import {AwsStorageAdapter} from './adapter-aws/AwsStorageAdapter'
import {AwsQueueAdapter} from './adapter-aws/AwsQueueAdapter'
import {AwsFunctionAdapter} from './adapter-aws/AwsFunctionAdapter'
import {AwsEventsAdapter} from './adapter-aws/AwsEventsAdapter'
import {AwsObservabilityAdapter} from './adapter-aws/AwsObservabilityAdapter'
import {AzureStorageAdapter} from './adapter-azure/AzureStorageAdapter'
import {CloudProxyService} from './service/CloudProxyService'

export function createCloudProxyService(): CloudProxyService {
    const registry = new CloudAdapterRegistry([
        new AwsStorageAdapter(),
        new AwsEksAdapter(),
        new AwsDatabaseAdapter(),
        new AwsComputeAdapter(),
        new AwsNetworkingAdapter(),
        new AwsQueueAdapter(),
        new AwsFunctionAdapter(),
        new AwsEventsAdapter(),
        new AwsObservabilityAdapter(),
        new AzureStorageAdapter(),
    ])

    return new CloudProxyService(registry)
}

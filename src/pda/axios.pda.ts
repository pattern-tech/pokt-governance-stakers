import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { WinstonProvider } from '@common/winston/winston.provider';
import { Pagination } from './interfaces/common.interface';

export class AxsiosRequest {
  constructor(
    protected readonly axios: HttpService,
    protected readonly logger: WinstonProvider,
    protected readonly config: ConfigService,
  ) {}

  protected async request<T>(
    query: string,
    variables?: Record<string, any>,
  ): Promise<T> {
    this.logger.debug(
      'request method\n' + `input => ${JSON.stringify({ query, variables })}\n`,
      'asdasd',
    );

    const response = await firstValueFrom(
      this.axios.post<T>(
        this.config.get<string>('MYGATEWAY_ENDPOINT_URL'),
        {
          query,
          variables,
        },
        {
          headers: {
            Authorization:
              'Bearer ' +
              this.config.get<string>('MYGATEWAY_AUTHENTICATION_TOKEN'),
            'x-api-key': this.config.get<string>('MYGATEWAY_API_KEY'),
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    this.logger.debug(
      `response => ${JSON.stringify({
        status: response.status,
        body: response.data,
      })}\n`,
      'asdasd',
    );

    return response.data;
  }

  protected pagination(max: number): Array<Pagination> {
    const pages: Array<Pagination> = [];

    if (max <= 100) {
      pages.push({ take: max, skip: 0 });
    } else {
      const pages_count = Math.ceil(max / 100);
      let take = 100;
      let skip = 0;

      for (let page = 1; page <= pages_count; page++) {
        const items_diff = max - page * take;

        pages.push({ take, skip });

        skip += take;
        take = items_diff < 100 ? items_diff : 100;
      }
    }

    return pages;
  }
}

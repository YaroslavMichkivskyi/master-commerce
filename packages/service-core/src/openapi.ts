import { STATUS_CODES } from 'node:http';
import { applyDecorators, type INestApplication } from '@nestjs/common';
import {
  ApiExtension,
  ApiExtraModels,
  ApiResponse,
  DocumentBuilder,
  getSchemaPath,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { FieldErrorDto, PROBLEM_CONTENT_TYPE, ProblemDto } from '@master-commerce/dto';

const AUTH_EXTENSION = 'x-auth';
const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

/** What the document says about the service. */
export interface DocsInfo {
  service: string;
  version: string;
  /** One line about the API. */
  description: string;
}

/**
 * Marks an endpoint (or every endpoint of a controller) as open to anyone (FR-051). Every
 * endpoint must say who may call it; until sign-in exists (TASK-7) that is "public".
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  ApiExtension(AUTH_EXTENSION, 'public');

/**
 * Error answers of an endpoint, each with the shared problem schema (FR-050):
 * `@ApiProblemResponses(404, [503, 'catalog-service is unreachable'])`.
 */
export function ApiProblemResponses(...responses: (number | [number, string])[]) {
  return applyDecorators(
    ApiExtraModels(ProblemDto, FieldErrorDto),
    ...responses.map((r) => {
      const [status, description] = Array.isArray(r) ? r : [r, STATUS_CODES[r] ?? 'Error'];
      return ApiResponse({ status, description, content: problemContent() });
    }),
  );
}

function problemContent() {
  return { [PROBLEM_CONTENT_TYPE]: { schema: { $ref: getSchemaPath(ProblemDto) } } };
}

/**
 * Builds the document of the app and serves it at `/docs` (Swagger UI) and `/docs-json`
 * (FR-050). Throws when an endpoint does not state its auth requirement (FR-051), so a
 * service with such an endpoint does not start.
 */
export function setupOpenApi(app: INestApplication, info: DocsInfo): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle(info.service)
    .setDescription(
      `${info.description}\n\nErrors are RFC 9457 problem details ` +
        `(\`${PROBLEM_CONTENT_TYPE}\`). Every response carries \`X-Request-Id\`; send one ` +
        'to correlate your logs with ours.',
    )
    .setVersion(info.version)
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ProblemDto, FieldErrorDto],
  });
  finishOperations(document);
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs-json' });
  return document;
}

/** Spells out the auth requirement and adds the `500` problem answer to every operation. */
function finishOperations(document: OpenAPIObject): void {
  const unmarked: string[] = [];
  for (const [path, item] of Object.entries(document.paths)) {
    for (const method of METHODS) {
      const op = item[method];
      if (!op) continue;
      if ((op as unknown as Record<string, unknown>)[AUTH_EXTENSION] === 'public') {
        op.security = [];
        op.description = [op.description, '**Auth:** public, no credentials needed.']
          .filter(Boolean)
          .join('\n\n');
      } else {
        unmarked.push(`${method.toUpperCase()} ${path}`);
      }
      op.responses['500'] ??= {
        description: 'Unexpected error; details are in the service log',
        content: problemContent(),
      };
    }
  }
  if (unmarked.length > 0) {
    throw new Error(
      `Endpoints without an auth requirement (mark them @Public()): ${unmarked.join(', ')}`,
    );
  }
}

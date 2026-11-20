/**
 * Upstream DevLoot Controller: Community Venue Projection
 * Target repository: devloot-xyz/devloot (server/src/modules/projects/http)
 */

import { GetProjectVenueProjectionUseCase } from '../application/get-project-venue-projection.usecase';
import { VenueProjectionQueryDto, VenueProjectionResponseDto } from '../dto/venue-projection.dto';

export class ProjectVenueProjectionController {
  constructor(private readonly useCase: GetProjectVenueProjectionUseCase) {}

  /**
   * GET /api/projects/:projectId/venue
   * Delivers a versioned public community venue projection.
   *
   * Rate limiting: standard public read tier (60 req/min).
   * CORS: public Access-Control-Allow-Origin: * on safe GET.
   * Security: No bearer token, cookie, or wallet identity required.
   */
  async getVenueProjection(
    projectIdParam: string | number,
    query: VenueProjectionQueryDto
  ): Promise<VenueProjectionResponseDto> {
    const projectId = typeof projectIdParam === 'string' ? parseInt(projectIdParam, 10) : projectIdParam;
    if (isNaN(projectId) || projectId <= 0) {
      const error: any = new Error('Invalid projectId parameter');
      error.statusCode = 400;
      throw error;
    }

    return this.useCase.execute(projectId, query);
  }
}

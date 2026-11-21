import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Inject, NotFoundException, Param, Put } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { isProfile, LayoutError, PROFILES, validateLayout } from './layout-validation';

/**
 * Layouts do dashboard por perfil (spec 8.7). Sem autenticação: o perfil é só um identificador
 * (diretor, gestor-armazem, comprador) e qualquer cliente pode ler/escrever o layout desse perfil.
 */
@Controller('layouts')
export class LayoutsController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private checkProfile(profile: string) {
    if (!isProfile(profile)) {
      throw new BadRequestException({ error: `Perfil desconhecido; use um de: ${PROFILES.join(', ')}.`, field: 'profile' });
    }
  }

  @Get(':profile')
  async get(@Param('profile') profile: string) {
    this.checkProfile(profile);
    const { rows } = await this.pool.query('SELECT layout_json FROM dashboard_layout WHERE profile = $1', [profile]);
    if (!rows[0]) throw new NotFoundException({ error: 'Este perfil ainda não tem layout guardado.' });
    return { layout: rows[0].layout_json };
  }

  @Put(':profile')
  async put(@Param('profile') profile: string, @Body() body: unknown) {
    this.checkProfile(profile);
    let layout;
    try {
      layout = validateLayout((body as { layout?: unknown } | undefined)?.layout);
    } catch (e) {
      if (e instanceof LayoutError) throw new BadRequestException({ error: e.message, field: e.field });
      throw e;
    }
    await this.pool.query(
      `INSERT INTO dashboard_layout (profile, layout_json) VALUES ($1, $2)
       ON CONFLICT (profile) DO UPDATE SET layout_json = EXCLUDED.layout_json, updated_at = now()`,
      [profile, JSON.stringify(layout)],
    );
    return { layout };
  }

  @Delete(':profile')
  @HttpCode(204)
  async remove(@Param('profile') profile: string) {
    this.checkProfile(profile);
    await this.pool.query('DELETE FROM dashboard_layout WHERE profile = $1', [profile]);
  }
}

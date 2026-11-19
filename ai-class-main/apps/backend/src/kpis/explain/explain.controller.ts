import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { getExplainEntry } from './registry';

@Controller('kpis')
export class ExplainController {
  /** Painel "Como é calculado": conteúdo vindo do servidor. 404 `{ error }` se o KPI não existir. */
  @Get(':id/explain')
  explain(@Param('id') id: string) {
    const entry = getExplainEntry(id);
    if (!entry) throw new NotFoundException({ error: `KPI desconhecido: ${id}` });
    return entry;
  }
}

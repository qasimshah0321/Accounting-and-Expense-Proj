import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess } from '../../utils/response';
import { getCompanyId } from '../../middleware/multiTenant';
import * as service from './pra.service';

export const getConfig = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cfg = await service.getPRAConfig(getCompanyId(req), false); // never returns raw tokens
    sendSuccess(res, cfg, 'PRA config retrieved');
  } catch (err) { next(err); }
};

export const saveConfig = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = req.body || {};
    const cfg = await service.savePRAConfig(getCompanyId(req), {
      pra_enabled: input.pra_enabled,
      pra_sandbox_mode: input.pra_sandbox_mode,
      pra_pntn: input.pra_pntn,
      pra_sandbox_pos_id: input.pra_sandbox_pos_id,
      pra_production_pos_id: input.pra_production_pos_id,
      pra_sandbox_token: input.pra_sandbox_token,
      pra_production_token: input.pra_production_token,
    });
    sendSuccess(res, cfg, 'PRA config saved');
  } catch (err) { next(err); }
};

export const testConnection = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.testPRAConnection(getCompanyId(req));
    sendSuccess(res, result, result.message);
  } catch (err) { next(err); }
};

export const submitInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.submitInvoiceToPRA(getCompanyId(req), req.params.invoiceId);
    sendSuccess(res, result, 'Invoice submitted to PRA successfully');
  } catch (err) { next(err); }
};

export const getInvoiceStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = await service.getInvoicePRAStatus(getCompanyId(req), req.params.invoiceId);
    sendSuccess(res, status, 'PRA submission status retrieved');
  } catch (err) { next(err); }
};

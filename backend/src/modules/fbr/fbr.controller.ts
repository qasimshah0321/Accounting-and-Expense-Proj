import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess } from '../../utils/response';
import { getCompanyId } from '../../middleware/multiTenant';
import { ValidationError } from '../../utils/errors';
import * as service from './fbr.service';

export const getConfig = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cfg = await service.getFBRConfig(getCompanyId(req), false); // never returns the raw token
    sendSuccess(res, cfg, 'FBR config retrieved');
  } catch (err) { next(err); }
};

export const saveConfig = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = req.body || {};
    const cfg = await service.saveFBRConfig(getCompanyId(req), {
      fbr_enabled: input.fbr_enabled,
      fbr_sandbox_mode: input.fbr_sandbox_mode,
      fbr_ntn: input.fbr_ntn,
      fbr_security_token: input.fbr_security_token,
      fbr_seller_business_name: input.fbr_seller_business_name,
      fbr_seller_province: input.fbr_seller_province,
      fbr_seller_address: input.fbr_seller_address,
      fbr_business_activity: input.fbr_business_activity,
      fbr_sector: input.fbr_sector,
      fbr_default_scenario_id: input.fbr_default_scenario_id,
    });
    sendSuccess(res, cfg, 'FBR config saved');
  } catch (err) { next(err); }
};

export const testConnection = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.testFBRConnection(getCompanyId(req));
    sendSuccess(res, result, result.message);
  } catch (err) { next(err); }
};

export const validateInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.validateInvoiceWithFBR(getCompanyId(req), req.params.invoiceId);
    sendSuccess(res, result, 'Invoice validated with FBR');
  } catch (err) { next(err); }
};

export const submitInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.submitInvoiceToFBR(getCompanyId(req), req.params.invoiceId);
    sendSuccess(res, result, 'Invoice submitted to FBR successfully');
  } catch (err) { next(err); }
};

export const getInvoiceStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = await service.getInvoiceFBRStatus(getCompanyId(req), req.params.invoiceId);
    sendSuccess(res, status, 'FBR submission status retrieved');
  } catch (err) { next(err); }
};

export const syncReference = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const result = await service.syncReferenceData(getCompanyId(req), type);
    sendSuccess(res, result, 'FBR reference data synced');
  } catch (err) { next(err); }
};

export const getReference = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rows = await service.getReferenceData(getCompanyId(req), req.params.type);
    sendSuccess(res, rows, 'FBR reference data retrieved');
  } catch (err) { next(err); }
};

export const lookupRegistration = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const regno = typeof req.query.regno === 'string' ? req.query.regno.trim() : '';
    if (!regno) throw new ValidationError('regno query parameter is required');
    const result = await service.lookupBuyerRegistration(getCompanyId(req), regno);
    sendSuccess(res, result, 'Buyer registration status retrieved');
  } catch (err) { next(err); }
};

import { FinancialIssue, IssueId, Owner, Repository, UserId } from "../model";
import Decimal from "decimal.js";
import { BackendAPIMock } from "src/__mocks__";
import {
  CreatePaymentIntentBody,
  CreatePaymentIntentParams,
  CreatePaymentIntentQuery,
  CreatePaymentIntentResponse,
  FundIssueBody,
  FundIssueParams,
  FundIssueQuery,
  GetAvailableDowResponse,
  GetDowPricesParams,
  GetDowPricesQuery,
  GetDowPricesResponse,
  GetIssueParams,
  GetIssueQuery,
  GetIssueResponse,
  GetIssuesParams,
  GetIssuesResponse,
  GetOwnerBody,
  GetOwnerParams,
  GetOwnerQuery,
  GetOwnerResponse,
  GetRepositoryBody,
  GetRepositoryParams,
  GetRepositoryQuery,
  GetRepositoryResponse,
  RequestIssueFundingBody,
  RequestIssueFundingParams,
  RequestIssueFundingQuery,
} from "src/dtos";
import { handleError } from "./index";
import axios from "axios";
import { GetAvailableDowParams, GetAvailableDowQuery } from "src/dtos/user/GetAvailableDow";
import { ApiError } from "src/ultils/error/ApiError";
import { config } from "src/ultils";

export function getBackendAPI(): BackendAPI {
  if (config.api.useMock) {
    return new BackendAPIMock();
  } else {
    return new BackendAPIImpl();
  }
}

export interface BackendAPI {
  /* Getters */

  getFinancialIssue(params: GetIssueParams, query: GetIssueQuery): Promise<FinancialIssue | ApiError>;

  getFinancialIssues(params: GetIssuesParams, query: GetIssueQuery): Promise<FinancialIssue[] | ApiError>;

  getAvailableDow(params: GetAvailableDowParams, query: GetAvailableDowQuery): Promise<Decimal | ApiError>;

  /**
   * Funds a specific issue.
   * @returns
   *
   * @throws {Error} If the issue is closed.
   * @throws {Error} If the userId or issueId is invalid or not found.
   * @throws {Error} If the amount is not a positive number.
   * @throws {Error} If there are insufficient funds.
   */
  fundIssue(params: FundIssueParams, body: FundIssueBody, query: FundIssueQuery): Promise<void | ApiError>;

  /**
   * Request or approve funding for an issue.
   *
   * @throws {Error} If the issue is already got requested funding.
   * @throws {Error} If the issue is closed.
   * @throws {Error} If the userId or issueId is invalid or not found.
   * @throws {Error} If the amount is not a positive number.
   */
  requestFunding(params: RequestIssueFundingParams, body: RequestIssueFundingBody, query: RequestIssueFundingQuery): Promise<void | ApiError>;

  /**
   * Reject funding for an issue.
   * @param userId
   * @param issueId
   */
  rejectFunding(userId: UserId, issueId: IssueId): Promise<void | ApiError>;

  // TODO: define UserId. could be email or id or github profile
  // TODO: dust remaining?
  splitFunding(userId: UserId, issueId: IssueId, funders: [UserId, Decimal][]): Promise<void | ApiError>;

  // TODO: maybe internal to the backend?
  updateIssueGitHubStatus(issueId: IssueId, status: string): Promise<void | ApiError>;

  getOwner(params: GetOwnerParams, query: GetOwnerQuery): Promise<GetOwnerResponse | ApiError>;

  getRepository(params: GetRepositoryParams, query: GetRepositoryQuery): Promise<GetRepositoryResponse | ApiError>;

  createPaymentIntent(
    params: CreatePaymentIntentParams,
    body: CreatePaymentIntentBody,
    query: CreatePaymentIntentQuery,
  ): Promise<CreatePaymentIntentResponse | ApiError>;

  getDowPrices(params: GetDowPricesParams, query: GetDowPricesQuery): Promise<GetDowPricesResponse | ApiError>;
}

class BackendAPIImpl implements BackendAPI {
  async getFinancialIssue(params: GetIssueParams, query: GetIssueQuery): Promise<FinancialIssue | ApiError> {
    const response = await handleError<GetIssueResponse>(
      () => axios.get(`${config.api.url}/github/${params.owner}/${params.repo}/issues/${params.number}`, { withCredentials: true }),
      "getFinancialIssue",
    );

    if (response instanceof ApiError) return response;
    else return response.issue;
  }

  async getFinancialIssues(params: GetIssuesParams, query: GetIssueQuery): Promise<FinancialIssue[] | ApiError> {
    const response = await handleError<GetIssuesResponse>(() => axios.get(`${config.api.url}/github/issues`, { withCredentials: true }), "getFinancialIssues");
    if (response instanceof ApiError) return response;
    else return response.issues;
  }

  async getAvailableDow(params: GetAvailableDowParams, query: GetAvailableDowQuery): Promise<Decimal | ApiError> {
    let queryParams = "";
    if (query.companyId) queryParams += `companyId=${encodeURIComponent(query.companyId)}`;

    const response = await handleError<GetAvailableDowResponse>(
      () => axios.get(`${config.api.url}/user/available-dow?${queryParams}`, { withCredentials: true }),
      "getAvailableDow",
    );

    if (response instanceof ApiError) return response;
    else return new Decimal(response.dowAmount);
  }

  async fundIssue(params: FundIssueParams, body: FundIssueBody, query: FundIssueQuery): Promise<void | ApiError> {
    return handleError(
      () => axios.post(`${config.api.url}/github/${params.owner}/${params.repo}/issues/${params.number}/fund`, body, { withCredentials: true }),
      "fundIssue",
    );
  }

  async rejectFunding(userId: UserId, issueId: IssueId): Promise<void | ApiError> {
    return Promise.resolve(undefined);
  }

  async requestFunding(params: RequestIssueFundingParams, body: RequestIssueFundingBody, query: RequestIssueFundingQuery): Promise<void | ApiError> {
    return handleError(
      () => axios.post(`${config.api.url}/github/${params.owner}/${params.repo}/issues/${params.number}/request-funding`, body, { withCredentials: true }),
      "requestFunding",
    );
  }

  async splitFunding(userId: UserId, issueId: IssueId, funders: [UserId, Decimal][]): Promise<void | ApiError> {
    return Promise.resolve(undefined);
  }

  async updateIssueGitHubStatus(issueId: IssueId, status: string): Promise<void | ApiError> {
    return Promise.resolve(undefined);
  }

  async getOwner(params: GetOwnerParams, query: GetOwnerQuery): Promise<GetOwnerResponse | ApiError> {
    return handleError(() => axios.get(`${config.api.url}/github/owners/${params.owner}`, { withCredentials: true }), "getOwner");
  }

  async getRepository(params: GetRepositoryParams, query: GetRepositoryQuery): Promise<GetRepositoryResponse | ApiError> {
    return handleError(() => axios.get(`${config.api.url}/github/repos/${params.owner}/${params.repo}`, { withCredentials: true }), "getRepository");
  }

  async createPaymentIntent(
    params: CreatePaymentIntentParams,
    body: CreatePaymentIntentBody,
    query: CreatePaymentIntentQuery,
  ): Promise<CreatePaymentIntentResponse | ApiError> {
    return handleError(() => axios.post(`${config.api.url}/shop/create-payment-intent`, body, { withCredentials: true }), "createPaymentIntent");
  }

  async getDowPrices(params: GetDowPricesParams, query: GetDowPricesQuery): Promise<GetDowPricesResponse | ApiError> {
    return handleError(() => axios.get(`${config.api.url}/shop/dow-prices`, { withCredentials: true }), "getDowPrices");
  }
}

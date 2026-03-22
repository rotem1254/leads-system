export interface LandingPage {
  id: string;
  name: string;
  slug: string;
  user_id: string;
  public_token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LandingPageWithOwner extends LandingPage {
  owner_name?: string | null;
  owner_email?: string | null;
}

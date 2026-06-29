/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { authenticatedFetch } from "../api";

const TenantContext = createContext();

export function useTenant() {
  return useContext(TenantContext);
}

export function TenantProvider({ children }) {
  const { currentUser } = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [organizations, setOrganizations] = useState([]); // Used by super_admin
  const [activeOrg, setActiveOrg] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load tenant list / memberships when user changes
  useEffect(() => {
    async function loadTenantData() {
      if (!currentUser) {
        setMemberships([]);
        setOrganizations([]);
        setActiveOrg(null);
        setActiveRole(null);
        return;
      }

      setLoading(true);
      try {
        // 1. Fetch memberships (For Student/Mentor/Evaluator/OrgAdmin)
        const data = await authenticatedFetch("/api/v2/student/organizations");
        const list = data.memberships || [];
        setMemberships(list);

        // 2. Fetch all organizations if global super_admin
        if (currentUser.globalRole === "super_admin" || currentUser.role === "admin") {
          try {
            const orgsData = await authenticatedFetch("/api/v2/organizations?limit=100");
            const allOrgs = orgsData.data || [];
            setOrganizations(allOrgs);
          } catch (e) {
            console.error("Super Admin failed to fetch all organizations:", e);
          }
        }

        // Determine active organization
        const savedOrgId = localStorage.getItem(`selectedOrgId:${currentUser.uid}`);
        let match = null;

        // Try to match saved selection from memberships
        if (savedOrgId) {
          match = list.find(m => m.organizationId === savedOrgId);
          if (!match && (currentUser.globalRole === "super_admin" || currentUser.role === "admin")) {
            // Check global orgs list
            const foundOrg = await authenticatedFetch(`/api/v2/organizations/${savedOrgId}`).catch(() => null);
            if (foundOrg) {
              match = {
                organizationId: foundOrg._id,
                role: "org_admin",
                organization: foundOrg
              };
            }
          }
        }

        // Fallback to first membership, or first organization for super_admin
        if (!match) {
          if (list.length > 0) {
            match = list[0];
          } else if (currentUser.globalRole === "super_admin" || currentUser.role === "admin") {
            // If super_admin and no memberships, create a virtual membership using first org
            const orgsData = await authenticatedFetch("/api/v2/organizations?limit=100").catch(() => null);
            const firstOrg = orgsData?.data?.[0];
            if (firstOrg) {
              match = {
                organizationId: firstOrg._id,
                role: "org_admin",
                organization: firstOrg
              };
            }
          }
        }

        if (match) {
          selectTenant(match);
        } else {
          setActiveOrg(null);
          setActiveRole(null);
        }
      } catch (err) {
        console.error("Failed to load organization contexts:", err);
      } finally {
        setLoading(false);
      }
    }

    loadTenantData();
  }, [currentUser]);

  // Apply dynamic branding variables
  useEffect(() => {
    if (activeOrg) {
      const primaryColor = activeOrg.settings?.branding?.primaryColor || "#2563eb";
      document.documentElement.style.setProperty("--primary-color", primaryColor);
    } else {
      document.documentElement.style.setProperty("--primary-color", "#2563eb");
    }
  }, [activeOrg]);

  function selectTenant(match) {
    setActiveOrg(match.organization);
    // If global role is super_admin, they act as super_admin, otherwise org membership role
    if (currentUser?.globalRole === "super_admin") {
      setActiveRole("super_admin");
    } else {
      setActiveRole(match.role);
    }
    localStorage.setItem(`selectedOrgId:${currentUser.uid}`, match.organizationId);
  }

  async function switchOrganization(orgId) {
    if (!currentUser) return;
    setLoading(true);
    try {
      // Find in existing memberships
      let match = memberships.find(m => m.organizationId === orgId);
      if (!match) {
        // Super admin acting as admin on any tenant
        const orgDetails = await authenticatedFetch(`/api/v2/organizations/${orgId}`);
        match = {
          organizationId: orgId,
          role: "org_admin",
          organization: orgDetails
        };
      }
      selectTenant(match);
    } catch (err) {
      console.error("Failed to switch organization:", err);
    } finally {
      setLoading(false);
    }
  }

  const value = {
    memberships,
    organizations,
    activeOrg,
    activeRole,
    loading,
    switchOrganization,
    refreshMemberships: async () => {
      if (currentUser) {
        const data = await authenticatedFetch("/api/v2/student/organizations");
        setMemberships(data.memberships || []);
      }
    }
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

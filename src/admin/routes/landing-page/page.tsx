import { defineRouteConfig } from "@medusajs/admin-sdk";
import { BuildingStorefront } from "@medusajs/icons";
import {
    Container,
    Heading,
    Button,
    Text,
    toast,
    Toaster,
    Checkbox,
    Badge,
    Input,
} from "@medusajs/ui";
import { useState, useEffect, useCallback } from "react";

type Product = { id: string; title: string };
type Category = { id: string; name: string; handle: string };

const LandingPageSettings = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([]);
    const [featuredCategoryIds, setFeaturedCategoryIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [productSearch, setProductSearch] = useState("");
    const [categorySearch, setCategorySearch] = useState("");

    const fetchSettings = useCallback(async () => {
        try {
            const res = await fetch("/admin/landing-page-settings", {
                credentials: "include",
            });
            const data = await res.json();
            setFeaturedProductIds(data.featured_product_ids || []);
            setFeaturedCategoryIds(data.featured_category_ids || []);
        } catch {
            toast.error("Eroare la încărcarea setărilor");
        }
    }, []);

    const fetchProducts = useCallback(async () => {
        try {
            const res = await fetch(
                `/admin/products?limit=100&fields=id,title`,
                { credentials: "include" }
            );
            const data = await res.json();
            setProducts(data.products || []);
        } catch {
            toast.error("Eroare la încărcarea produselor");
        }
    }, []);

    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch(
                `/admin/product-categories?limit=100&fields=id,name,handle`,
                { credentials: "include" }
            );
            const data = await res.json();
            setCategories(data.product_categories || []);
        } catch {
            toast.error("Eroare la încărcarea categoriilor");
        }
    }, []);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchSettings(), fetchProducts(), fetchCategories()]);
            setLoading(false);
        };
        load();
    }, [fetchSettings, fetchProducts, fetchCategories]);

    const toggleProduct = (id: string) => {
        setFeaturedProductIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const toggleCategory = (id: string) => {
        setFeaturedCategoryIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/admin/landing-page-settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    featured_product_ids: featuredProductIds,
                    featured_category_ids: featuredCategoryIds,
                }),
            });
            if (!res.ok) throw new Error("Save failed");
            toast.success("Setările au fost salvate");
        } catch {
            toast.error("Eroare la salvarea setărilor");
        } finally {
            setSaving(false);
        }
    };

    const filteredProducts = products.filter((p) =>
        p.title?.toLowerCase().includes(productSearch.toLowerCase())
    );
    const filteredCategories = categories.filter(
        (c) =>
            c.name?.toLowerCase().includes(categorySearch.toLowerCase()) ||
            c.handle?.toLowerCase().includes(categorySearch.toLowerCase())
    );

    if (loading) {
        return (
            <Container>
                <Text>Se încarcă...</Text>
            </Container>
        );
    }

    return (
        <Container>
            <Toaster />
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Heading level="h1">Landing Page</Heading>
                        <Text className="text-ui-fg-subtle mt-1">
                            Selectează produsele și categoriile afișate pe pagina principală
                        </Text>
                    </div>
                    <Button
                        variant="primary"
                        disabled={saving}
                        onClick={handleSave}
                    >
                        {saving ? "Se salvează..." : "Salvează"}
                    </Button>
                </div>

                <div className="grid grid-cols-1 large:grid-cols-2 gap-6">
                    {/* Produse */}
                    <div className="border border-ui-border-base rounded-lg p-4">
                        <Heading level="h2" className="mb-2">
                            Produse featured
                        </Heading>
                        <Text className="text-ui-fg-subtle text-sm mb-3">
                            Produsele selectate vor apărea în secțiunea dedicată pe landing page
                        </Text>
                        <Input
                            placeholder="Caută produs..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="mb-3"
                        />
                        <div className="max-h-64 overflow-y-auto space-y-2">
                            {filteredProducts.length === 0 ? (
                                <Text className="text-ui-fg-subtle">
                                    Nu există produse
                                </Text>
                            ) : (
                                filteredProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        className="flex items-center gap-2 py-2 border-b border-ui-border-base last:border-0"
                                    >
                                        <Checkbox
                                            checked={featuredProductIds.includes(product.id)}
                                            onCheckedChange={() => toggleProduct(product.id)}
                                        />
                                        <span className="flex-1 truncate">
                                            {product.title}
                                        </span>
                                        {featuredProductIds.includes(product.id) && (
                                            <Badge color="green">Selectat</Badge>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <Text className="text-ui-fg-subtle text-xs mt-2">
                            {featuredProductIds.length} produs(e) selectat(e)
                        </Text>
                    </div>

                    {/* Categorii */}
                    <div className="border border-ui-border-base rounded-lg p-4">
                        <Heading level="h2" className="mb-2">
                            Categorii featured
                        </Heading>
                        <Text className="text-ui-fg-subtle text-sm mb-3">
                            Categoriile selectate vor apărea în secțiunile de pe landing page
                        </Text>
                        <Input
                            placeholder="Caută categorie..."
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            className="mb-3"
                        />
                        <div className="max-h-64 overflow-y-auto space-y-2">
                            {filteredCategories.length === 0 ? (
                                <Text className="text-ui-fg-subtle">
                                    Nu există categorii
                                </Text>
                            ) : (
                                filteredCategories.map((category) => (
                                    <div
                                        key={category.id}
                                        className="flex items-center gap-2 py-2 border-b border-ui-border-base last:border-0"
                                    >
                                        <Checkbox
                                            checked={featuredCategoryIds.includes(category.id)}
                                            onCheckedChange={() => toggleCategory(category.id)}
                                        />
                                        <span className="flex-1 truncate">
                                            {category.name}
                                        </span>
                                        {featuredCategoryIds.includes(category.id) && (
                                            <Badge color="green">Selectat</Badge>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <Text className="text-ui-fg-subtle text-xs mt-2">
                            {featuredCategoryIds.length} categorie(i) selectată(e)
                        </Text>
                    </div>
                </div>
            </div>
        </Container>
    );
};

export const config = defineRouteConfig({
    label: "Landing Page",
    icon: BuildingStorefront,
});

export default LandingPageSettings;

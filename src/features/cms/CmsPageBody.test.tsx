import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { CmsPageBody } from "./CmsPageBody";

describe("CmsPageBody", () => {
  it("renders blocks when content_json holds a valid block array", () => {
    renderWithProviders(
      <CmsPageBody
        bodyHtml="<p>Старый текст, не должен показаться</p>"
        contentJson={[{ id: "1", type: "heading", text: "О компании", level: 2 }]}
      />,
    );

    expect(screen.getByText("О компании")).toBeInTheDocument();
    expect(screen.queryByText("Старый текст, не должен показаться")).not.toBeInTheDocument();
  });

  it("falls back to body_html when content_json is null (legacy page)", () => {
    renderWithProviders(<CmsPageBody bodyHtml="<p>Мы на рынке 15 лет</p>" contentJson={null} />);

    expect(screen.getByText("Мы на рынке 15 лет")).toBeInTheDocument();
  });

  it("falls back to body_html when content_json is an empty block list", () => {
    renderWithProviders(<CmsPageBody bodyHtml="<p>Пустой конструктор</p>" contentJson={[]} />);

    expect(screen.getByText("Пустой конструктор")).toBeInTheDocument();
  });
});
